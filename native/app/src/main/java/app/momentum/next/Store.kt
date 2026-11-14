package app.momentum.next

import android.content.Context
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.net.URLEncoder
import java.text.NumberFormat
import java.time.DayOfWeek
import java.time.Instant
import java.time.LocalDate
import java.time.temporal.TemporalAdjusters
import java.util.Locale
import kotlin.math.abs
import kotlin.math.roundToLong

/** One daily entry of the web app: money.weeks[<monday>].daily[]. */
data class Expense(val id: String, val date: String, val name: String, val cat: String?, val amount: Double)

/** Spending categories, the same keys as DCATS in the web app (src/3-views-a.js). */
data class Cat(val key: String, val label: String, val name: String)

val CATS = listOf(
    Cat("kahve", "Kahve", "Kahve"), Cat("yemek", "Yemek", "Yemek"), Cat("market", "Market", "Market"), Cat("yakit", "Yakıt", "Yakıt (Uber)"),
    Cat("ulasim", "Ulaşım", "Ulaşım"), Cat("eglence", "Eğlence", "Eğlence"), Cat("fatura", "Fatura", "Fatura"), Cat("diger", "Diğer", "Diğer"),
)
const val FUEL = "yakit"
fun catOf(key: String?): Cat = CATS.find { it.key == key } ?: CATS.last()

/** A one-tap chip: a name the user logs often. amount == null means "ask for the amount". */
data class Quick(val name: String, val cat: String, val amount: Double?)

sealed class SyncState {
    data object Off : SyncState()
    data object Syncing : SyncState()
    data class Ok(val at: Long) : SyncState()
    data object Offline : SyncState()
    data class Error(val msg: String) : SyncState()
}

private val TR = Locale("tr", "TR")

/** Whole dollars, for totals: $1.234 */
fun usd(v: Double): String = (if (v < -0.5) "−$" else "$") + NumberFormat.getIntegerInstance(TR).format(abs(v).roundToLong())

/** Entered amounts keep their cents: $4,50 */
fun money(v: Double): String {
    val c = (abs(v) * 100).roundToLong()
    if (c % 100 == 0L) return usd(v)
    val f = NumberFormat.getNumberInstance(TR).apply { minimumFractionDigits = 2; maximumFractionDigits = 2 }
    return (if (v < 0) "−$" else "$") + f.format(c / 100.0)
}

private fun r2(v: Double) = Math.round(v * 100) / 100.0
private fun mondayOf(d: LocalDate) = d.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY))
private fun newId(): String = (1..7).map { "abcdefghijklmnopqrstuvwxyz0123456789".random() }.joinToString("")

/**
 * The money area of the web app, kept in the web app's own format so nothing is lost.
 *
 * Signed out: changes go straight into the local copy.
 * Signed in: each change is applied locally right away and also queued. A sync fetches the latest cloud row, replays the
 * queued changes on top of it and writes it back only if nobody wrote in between (updated_at must still match).
 * So fields this app does not know about (shifts, logbook, accounts, tax...) are always carried over untouched.
 */
class Store(ctx: Context) {
    val supa = Supa(ctx)
    private val file = File(ctx.filesDir, "money.json")
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main)
    private val mutex = Mutex()
    private val lock = Any()

    private var doc = JSONObject()
    private var remoteAt: String? = null
    private var pending = JSONArray()
    private var docUser: String? = null

    var expenses by mutableStateOf(listOf<Expense>())
        private set
    var target by mutableStateOf(0.0)
        private set
    /** This week's numbers from the ported web engine (Calc.kt): income, tax, what is left, the savings plan. */
    var plan by mutableStateOf(Calc(JSONObject()).weekPlan())
        private set
    var syncState by mutableStateOf<SyncState>(SyncState.Off)
        private set
    var email by mutableStateOf(supa.session?.email)
        private set

    init {
        load()
        val s = supa.session
        if (s != null && docUser != s.userId) synchronized(lock) { doc = JSONObject(); pending = JSONArray(); remoteAt = null }
        refresh()
    }

    val weekId: String get() = mondayOf(LocalDate.now()).toString()

    private fun week(): JSONObject? = doc.optJSONObject("weeks")?.optJSONObject(weekId)

    /** This week's entries that count as spending: fuel is the Uber fuel line unless there were no Uber earnings (as dailySum in the web app). */
    val weekSpend: List<Expense>
        get() {
            val from = weekId
            val to = mondayOf(LocalDate.now()).plusDays(6).toString()
            val earn = week()?.optDouble("uberEarn", 0.0) ?: 0.0
            return expenses.filter { it.date in from..to && (it.cat != FUEL || earn <= 0) }
        }

    val spent: Double get() = r2(weekSpend.sumOf { it.amount })

    /** Spending this week by category, largest first. */
    val byCat: List<Pair<String, Double>>
        get() = weekSpend.groupBy { catOf(it.cat).label }
            .map { (k, v) -> k to v.sumOf { it.amount } }
            .sortedByDescending { it.second }

    /** The name + amount pairs logged most often in the last 60 days, padded with plain categories. */
    val quick: List<Quick>
        get() {
            val since = LocalDate.now().minusDays(60).toString()
            val frequent = expenses.filter { it.date >= since && it.cat != null }
                .groupBy { Triple(it.name, it.cat!!, it.amount) }
                .filter { it.value.size >= 2 }
                .entries.sortedByDescending { it.value.size }
                .map { Quick(it.key.first, it.key.second, it.key.third) }
                .distinctBy { it.name }
                .take(2)
            val rest = CATS.filter { c -> frequent.none { it.name == c.name } }.map { Quick(it.name, it.key, null) }
            return (frequent + rest).take(4)
        }

    // ------------------------------------------------------------ changes

    fun add(name: String, cat: String, amount: Double): Expense {
        val today = LocalDate.now()
        val e = Expense(newId(), today.toString(), name, cat, r2(amount))
        val op = JSONObject().put("op", "add").put("week", mondayOf(today).toString())
            .put("e", JSONObject().put("id", e.id).put("date", e.date).put("name", e.name).put("amount", e.amount).put("cat", e.cat))
        change(op)
        return e
    }

    fun remove(id: String) = change(JSONObject().put("op", "del").put("id", id))

    fun saveTarget(goal: Double) {
        if (goal != target) change(JSONObject().put("op", "target").put("v", goal))
    }

    private fun change(op: JSONObject) {
        synchronized(lock) {
            applyOp(doc, op)
            if (supa.session != null) pending.put(op)
        }
        save()
        refresh()
        syncSoon()
    }

    // ------------------------------------------------------------ account

    suspend fun signIn(email: String, password: String) {
        withContext(Dispatchers.IO) { supa.signIn(email.trim(), password) }
        // the cloud is the source of truth: local entries made while signed out are replaced by the cloud data
        synchronized(lock) { doc = JSONObject(); pending = JSONArray(); remoteAt = null; docUser = supa.session?.userId }
        this.email = supa.session?.email
        save()
        refresh()
        syncNow()
    }

    fun signOut() {
        scope.launch {
            withContext(Dispatchers.IO) { supa.signOut() }
            synchronized(lock) { pending = JSONArray() }
            email = null
            syncState = SyncState.Off
            save()
        }
    }

    // ------------------------------------------------------------ sync

    private var timer: Job? = null

    fun syncSoon(ms: Long = 1500) {
        if (supa.session == null) return
        timer?.cancel()
        // the sync itself is launched outside the timer, so a later syncSoon() never cancels a write in flight
        timer = scope.launch { delay(ms); scope.launch { syncNow() } }
    }

    suspend fun syncNow() {
        if (supa.session == null) return
        mutex.withLock { doSync() }
    }

    private suspend fun doSync() {
        val s = supa.session ?: return
        syncState = SyncState.Syncing
        try {
            val ok = withContext(Dispatchers.IO) { pushPull(s.userId) }
            if (ok) {
                withContext(Dispatchers.IO) {
                    try {
                        supa.rest(
                            "POST", "/rest/v1/devices?on_conflict=id,user_id",
                            JSONArray().put(JSONObject().put("id", supa.deviceId).put("user_id", s.userId).put("name", "Momentum 3 (Kotlin)").put("platform", "android-native").put("last_seen", Instant.now().toString())).toString(),
                            mapOf("Prefer" to "resolution=merge-duplicates,return=minimal"),
                        )
                    } catch (e: Exception) {}
                }
                syncState = SyncState.Ok(System.currentTimeMillis())
            } else {
                syncState = SyncState.Error("Başka bir cihaz aynı anda yazıyor; birazdan tekrar denenecek.")
                syncSoon(5000)
            }
        } catch (e: SbError) {
            syncState = when {
                e.network -> SyncState.Offline
                e.status == 401 || (e.status == 400 && "refresh" in (e.message ?: "").lowercase()) -> {
                    supa.clearSession(); email = null; SyncState.Error("Oturum süresi doldu, yeniden giriş yap.")
                }
                else -> SyncState.Error("Senkron hatası: ${e.message}")
            }
        } catch (e: Exception) {
            syncState = SyncState.Error("Senkron hatası: ${e.message}")
        }
    }

    /** Runs on IO. Returns false when another device kept winning the race. */
    private suspend fun pushPull(uid: String): Boolean {
        repeat(4) {
            val rows = JSONArray(supa.rest("GET", "/rest/v1/user_docs?select=data,updated_at&doc=eq.money&user_id=eq.$uid"))
            val row = rows.optJSONObject(0)
            val base = row?.optJSONObject("data") ?: JSONObject()
            val at = row?.optString("updated_at")?.ifEmpty { null }
            val ops = synchronized(lock) { JSONArray(pending.toString()) }
            if (ops.length() == 0) {
                commit(base, at, 0)
                return true
            }
            val next = JSONObject(base.toString())
            for (i in 0 until ops.length()) applyOp(next, ops.getJSONObject(i))
            val now = Instant.now().toString()
            if (row == null) {
                try {
                    supa.rest(
                        "POST", "/rest/v1/user_docs",
                        JSONArray().put(JSONObject().put("user_id", uid).put("doc", "money").put("data", next).put("updated_at", now).put("device_id", supa.deviceId)).toString(),
                        mapOf("Prefer" to "return=minimal"),
                    )
                } catch (e: SbError) {
                    if (e.status == 409) return@repeat // someone created it first: fetch again
                    throw e
                }
                commit(next, now, ops.length())
                return true
            }
            // write only if the row is still the one we read; otherwise fetch again and replay
            val res = JSONArray(
                supa.rest(
                    "PATCH", "/rest/v1/user_docs?doc=eq.money&user_id=eq.$uid&updated_at=eq.${URLEncoder.encode(at, "UTF-8")}&select=updated_at",
                    JSONObject().put("data", next).put("updated_at", now).put("device_id", supa.deviceId).toString(),
                    mapOf("Prefer" to "return=representation"),
                ),
            )
            if (res.length() == 0) return@repeat
            commit(next, res.getJSONObject(0).optString("updated_at", now), ops.length())
            return true
        }
        return false
    }

    /** Takes [base] as the new truth, drops the first [sent] queued changes and replays the rest on top of it. */
    private suspend fun commit(base: JSONObject, at: String?, sent: Int) {
        withContext(Dispatchers.Main) {
            synchronized(lock) {
                val rest = JSONArray()
                for (i in sent until pending.length()) rest.put(pending.getJSONObject(i))
                pending = rest
                doc = JSONObject(base.toString())
                for (i in 0 until pending.length()) applyOp(doc, pending.getJSONObject(i))
                remoteAt = at
                docUser = supa.session?.userId
            }
            save()
            refresh()
        }
    }

    // ------------------------------------------------------------ model

    /** Applies one change to a money document. Every change is idempotent, so replaying it after a lost reply is safe. */
    private fun applyOp(d: JSONObject, op: JSONObject) {
        when (op.optString("op")) {
            "add" -> {
                val wid = op.getString("week")
                val weeks = d.optJSONObject("weeks") ?: JSONObject().also { d.put("weeks", it) }
                val w = weeks.optJSONObject(wid) ?: JSONObject()
                    .put("start", wid).put("uberEarn", "").put("uberHours", "").put("fuel", "").put("cashHours", "")
                    .put("extras", JSONArray()).put("daily", JSONArray()).put("note", "").also { weeks.put(wid, it) }
                val daily = w.optJSONArray("daily") ?: JSONArray().also { w.put("daily", it) }
                val e = op.getJSONObject("e")
                val id = e.getString("id")
                if ((0 until daily.length()).none { daily.optJSONObject(it)?.optString("id") == id }) daily.put(JSONObject(e.toString()))
            }
            "del" -> {
                val id = op.getString("id")
                val weeks = d.optJSONObject("weeks") ?: return
                for (k in weeks.keys()) {
                    val daily = weeks.optJSONObject(k)?.optJSONArray("daily") ?: continue
                    for (i in 0 until daily.length()) {
                        val x = daily.optJSONObject(i) ?: continue
                        // entries paid from an account also moved its balance; only the web app knows how to undo that
                        if (x.optString("id") == id && !x.has("acc")) { daily.remove(i); return }
                    }
                }
            }
            "target" -> {
                val st = d.optJSONObject("settings") ?: JSONObject().also { d.put("settings", it) }
                st.put("saveTarget", op.getDouble("v"))
            }
        }
    }

    private fun refresh() {
        val out = ArrayList<Expense>()
        val t: Double
        synchronized(lock) {
            // odd data must never stop the screen from drawing: keep the previous numbers if the engine trips
            try { plan = Calc(doc).weekPlan() } catch (e: Exception) {}
            val weeks = doc.optJSONObject("weeks")
            if (weeks != null) for (k in weeks.keys()) {
                val daily = weeks.optJSONObject(k)?.optJSONArray("daily") ?: continue
                for (i in 0 until daily.length()) {
                    val x = daily.optJSONObject(i) ?: continue
                    val cat = if (x.isNull("cat")) null else x.optString("cat")
                    out.add(Expense(x.optString("id"), x.optString("date", k), x.optString("name").ifEmpty { catOf(cat).name }, cat, x.optDouble("amount", 0.0)))
                }
            }
            t = doc.optJSONObject("settings")?.optDouble("saveTarget", 0.0)?.takeIf { !it.isNaN() } ?: 0.0
        }
        // newest first; within a day the web app appends, so a later position is newer
        expenses = out.withIndex().sortedWith(compareByDescending<IndexedValue<Expense>> { it.value.date }.thenByDescending { it.index }).map { it.value }
        target = t
    }

    private fun load() {
        if (!file.exists()) return
        try {
            val o = JSONObject(file.readText())
            doc = o.optJSONObject("doc") ?: JSONObject()
            pending = o.optJSONArray("pending") ?: JSONArray()
            remoteAt = o.optString("remoteAt").ifEmpty { null }
            docUser = o.optString("user").ifEmpty { null }
        } catch (e: Exception) {
            // a broken file must not stop the app from opening; keep it aside for recovery
            file.copyTo(File(file.parentFile, "money.broken.json"), overwrite = true)
        }
    }

    private fun save() {
        val text = synchronized(lock) {
            JSONObject().put("v", 2).put("doc", doc).put("pending", pending).put("remoteAt", remoteAt ?: "").put("user", docUser ?: "").toString()
        }
        val tmp = File(file.parentFile, "money.json.tmp")
        tmp.writeText(text)
        if (!tmp.renameTo(file)) { file.delete(); tmp.renameTo(file) }
    }
}
