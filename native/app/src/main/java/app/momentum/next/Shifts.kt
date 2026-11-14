package app.momentum.next

import org.json.JSONArray
import org.json.JSONObject
import java.text.NumberFormat
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.util.Locale
import kotlin.math.max
import kotlin.math.roundToLong

/**
 * Uber shifts by odometer, the same rules as src/5-logbook.js.
 * money.trips: [{ id, start: ms, end: ms|null, kmStart, kmEnd }]   one shift = online → offline
 */
data class Shift(val id: String, val start: Long, val end: Long?, val kmStart: Double?, val kmEnd: Double?) {
    val km: Double get() = if (end != null && kmEnd != null && kmStart != null) max(0.0, kmEnd - kmStart) else 0.0
}

data class WeekShifts(val n: Int, val km: Double, val ms: Long)

private val TRS = Locale("tr", "TR")
private const val WEEK_MS = 7 * 86_400_000L

fun fmtKm(v: Double): String = NumberFormat.getIntegerInstance(TRS).format(v.roundToLong())
fun hhmm(ts: Long, zone: ZoneId = ZoneId.systemDefault()): String = Instant.ofEpochMilli(ts).atZone(zone).format(DateTimeFormatter.ofPattern("HH:mm"))
fun durTxt(ms: Long): String {
    val m = max(0L, Math.round(ms / 60000.0))
    return if (m < 60) "$m dk" else if (m % 60 != 0L) "${m / 60} sa ${m % 60} dk" else "${m / 60} sa"
}

private fun num(o: JSONObject, k: String): Double? = if (o.isNull(k)) null else o.optDouble(k).takeIf { it.isFinite() }
private fun ms(o: JSONObject, k: String): Long? = num(o, k)?.toLong()?.takeIf { it != 0L }

fun shiftsOf(d: JSONObject): List<Shift> {
    val a = d.optJSONArray("trips") ?: return emptyList()
    return (0 until a.length()).mapNotNull { i ->
        val t = a.optJSONObject(i) ?: return@mapNotNull null
        Shift(t.optString("id"), ms(t, "start") ?: return@mapNotNull null, ms(t, "end"), num(t, "kmStart"), num(t, "kmEnd"))
    }
}

fun openShift(d: JSONObject): Shift? = shiftsOf(d).find { it.end == null }

/** A shift left open from an earlier day (forgot to tap Bitir). */
fun isStale(o: Shift?, now: Long, zone: ZoneId = ZoneId.systemDefault()): Boolean =
    o != null && Instant.ofEpochMilli(o.start).atZone(zone).toLocalDate() != Instant.ofEpochMilli(now).atZone(zone).toLocalDate() && now - o.start > 6 * 3_600_000L

/** Every odometer reading the app knows about, oldest first: (ts, km). */
fun odoReadings(d: JSONObject): List<Pair<Long, Double>> {
    val r = ArrayList<Pair<Long, Double>>()
    shiftsOf(d).forEach { t ->
        if (t.kmStart != null) r.add(t.start to t.kmStart)
        if (t.end != null && t.kmEnd != null) r.add(t.end to t.kmEnd)
    }
    d.optJSONArray("odo")?.let { a ->
        for (i in 0 until a.length()) {
            val o = a.optJSONObject(i) ?: continue
            r.add((ms(o, "ts") ?: continue) to (num(o, "km") ?: continue))
        }
    }
    d.optJSONObject("lb")?.let { lb ->
        val s = ms(lb, "startTs"); val k = num(lb, "odoStart")
        if (s != null && k != null) r.add(s to k)
        val e = ms(lb, "endTs"); val ke = num(lb, "odoEnd")
        if (e != null && ke != null) r.add(e to ke)
    }
    return r.sortedBy { it.first }
}

fun lastOdo(d: JSONObject): Pair<Long, Double>? = odoReadings(d).lastOrNull()

/** A reading must not go below the latest earlier reading (odometers only go up). */
fun odoFloor(d: JSONObject, ts: Long): Double? = odoReadings(d).filter { it.first <= ts }.maxOfOrNull { it.second }

fun weekShifts(d: JSONObject, monday: LocalDate, zone: ZoneId = ZoneId.systemDefault()): WeekShifts {
    val a = monday.atStartOfDay(zone).toInstant().toEpochMilli()
    val ts = shiftsOf(d).filter { it.end != null && it.start >= a && it.start < a + WEEK_MS }
    return WeekShifts(ts.size, ts.sumOf { it.km }, ts.sumOf { it.end!! - it.start })
}

/** Why this shift start / end cannot be saved, or null when it is fine (submitShift in the web app). */
fun shiftError(d: JSONObject, end: Boolean, km: Long?, ts: Long, now: Long, zone: ZoneId = ZoneId.systemDefault()): String? {
    if (km == null || km < 0 || km > 3_000_000) return "Göstergedeki km'yi yaz."
    if (ts > now + 5 * 60000) return "Gelecekte bir saat seçilemez."
    val o = openShift(d)
    if (end) {
        if (o == null) return "Açık vardiya yok."
        if (ts <= o.start) return "Bitiş saati başlangıçtan (${hhmm(o.start, zone)}) sonra olmalı."
        val k0 = o.kmStart ?: 0.0
        if (km < k0) return "Bitiş km'si başlangıçtan (${fmtKm(k0)}) küçük olamaz."
        if (km - k0 > 1500) return "Tek vardiyada ${fmtKm(km - k0)} km çok fazla; rakamı kontrol et."
        return null
    }
    val fl = odoFloor(d, ts)
    if (fl != null && km < fl) return "Gösterge daha önceki okumadan (${fmtKm(fl)} km) küçük olamaz."
    if (o != null) return "Zaten açık bir vardiya var."
    return null
}

/**
 * Applies one shift change to a money document. Returns false when [op] is not a shift change.
 * Each change is safe to replay: a start is skipped when that shift exists or another shift is already open
 * (for example one started on the web meanwhile), an end only closes a shift that is still open.
 */
fun applyTripOp(d: JSONObject, op: JSONObject): Boolean {
    when (op.optString("op")) {
        "tripStart" -> {
            val t = op.getJSONObject("t")
            val trips = d.optJSONArray("trips") ?: JSONArray().also { d.put("trips", it) }
            val id = t.getString("id")
            val clash = (0 until trips.length()).any { i -> trips.optJSONObject(i)?.let { it.optString("id") == id || ms(it, "end") == null } ?: false }
            if (!clash) trips.put(JSONObject().put("id", id).put("start", t.getLong("start")).put("end", JSONObject.NULL).put("kmStart", t.getLong("kmStart")).put("kmEnd", JSONObject.NULL))
        }
        "tripEnd" -> each(d, op.getString("id")) { _, _, t -> if (ms(t, "end") == null) t.put("end", op.getLong("end")).put("kmEnd", op.getLong("kmEnd")) }
        // only a shift that is still open can be dropped here; finished shifts are deleted in the web app
        "tripCancel" -> each(d, op.getString("id")) { trips, i, t -> if (ms(t, "end") == null) trips.remove(i) }
        else -> return false
    }
    return true
}

private fun each(d: JSONObject, id: String, f: (JSONArray, Int, JSONObject) -> Unit) {
    val trips = d.optJSONArray("trips") ?: return
    for (i in 0 until trips.length()) {
        val t = trips.optJSONObject(i) ?: continue
        if (t.optString("id") == id) { f(trips, i, t); return }
    }
}
