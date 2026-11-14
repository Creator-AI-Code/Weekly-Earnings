package app.momentum.next

import org.json.JSONArray
import org.json.JSONObject
import java.time.LocalDate
import java.time.temporal.ChronoUnit
import java.time.temporal.TemporalAdjusters
import java.time.DayOfWeek
import kotlin.math.abs
import kotlin.math.ceil
import kotlin.math.max
import kotlin.math.min
import kotlin.math.roundToInt

// A line-by-line port of the web app's budget and tax engine, so both apps show the same numbers:
//   src/1-core.js  weekCalc, calc, safeToSpend
//   src/5-tax.js   quarterOf/qInfo, taxQuarter, taxShare, taxPart, weekTaxParts, taxFull, nextBas
//   src/5-plan.js  uberRate, plannedLeft, potNeeds, weekPlan, todayAdvice, planCard numbers
//   src/4-accounts.js moneyOwed
// Values are read the way JavaScript reads them (`+x || 0`), because the stored data mixes numbers and strings.

/** JS `+v || 0` */
fun jnum(v: Any?): Double = when (v) {
    null, JSONObject.NULL -> 0.0
    is Number -> v.toDouble().let { if (it.isNaN()) 0.0 else it }
    is Boolean -> if (v) 1.0 else 0.0
    is String -> v.trim().let { if (it.isEmpty()) 0.0 else it.toDoubleOrNull() ?: 0.0 }
    else -> 0.0
}

/** JS truthiness */
fun truthy(v: Any?): Boolean = when (v) {
    null, JSONObject.NULL -> false
    is Boolean -> v
    is Number -> v.toDouble().let { it != 0.0 && !it.isNaN() }
    is String -> v.isNotEmpty()
    else -> true
}

private fun r2(v: Double) = Math.round(v * 100) / 100.0
private fun JSONArray?.objs(): List<JSONObject> = if (this == null) emptyList() else (0 until length()).mapNotNull { optJSONObject(it) }
private fun sumAmt(a: JSONArray?) = r2(a.objs().sumOf { jnum(it.opt("amount")) })
private fun mondayOf(d: LocalDate) = d.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY))

private val BR = listOf(18200.0 to 0.0, 45000.0 to 0.15, 135000.0 to 0.30, 190000.0 to 0.37, Double.POSITIVE_INFINITY to 0.45)

fun itax(ti: Double): Double {
    var t = 0.0
    var p = 0.0
    for ((cap, r) in BR) {
        if (ti > p) t += (min(ti, cap) - p) * r
        p = cap
    }
    val l = when {
        ti <= 37500 -> 700.0
        ti <= 45000 -> 700 - 0.05 * (ti - 37500)
        ti <= 66667 -> 325 - 0.015 * (ti - 45000)
        else -> 0.0
    }
    return max(0.0, t - l)
}

fun mls(ti: Double, cover: Boolean): Double = when {
    cover || ti <= 105000 -> 0.0
    ti <= 123000 -> 0.01 * ti
    ti <= 164000 -> 0.0125 * ti
    else -> 0.015 * ti
}

fun ttax(ti: Double, cover: Boolean) = itax(ti) + 0.02 * ti + mls(ti, cover)

/** One week's money, as calc() returns it. left = what can still be spent this week. */
data class WeekNums(
    val E: Double, val H: Double, val fuel: Double, val fx: Double, val gst: Double, val uberTax: Double, val uberNet: Double,
    val cashNet: Double, val salaryNet: Double, val rec: Double, val extra: Double, val income: Double, val left: Double,
    val weekTax: Double, val daily: Double,
)

data class Quarter(val key: String, val fy: Int, val q: Int, val start: LocalDate, val end: LocalDate, val due: LocalDate) {
    val startId: String get() = start.toString()
    val endId: String get() = end.toString()
}

private class TaxBucket(var E: Double = 0.0, var gross: Double = 0.0, var fees: Double = 0.0, var credit: Double = 0.0, var exEx: Double = 0.0)

private class TaxQ(val key: String, val weeks: List<String>, val wk: Map<String, TaxBucket>, val loose: TaxBucket, val gst: Double, val profit: Double)

private class TaxShare(val A: Double, val rInc: Double, val rMls: Double, val tax: Double)

data class TaxParts(val gst: Double, val profit: Double, val inc: Double, val mls: Double, val tax: Double)

data class PlanShift(val wd: Int, val part: String, val h: Double)

data class PotNeed(val name: String, val perWeek: Double, val added: Double, val days: Int)

data class Advice(val level: Int, val title: String, val sub: String) // level: 0 green, 1 amber, 2 red

/** The numbers of the web app's Bugün screen for this week. */
data class WeekPlan(
    val weekId: String, val c: WeekNums, val daysLeft: Int, val perDaySafe: Double,
    val rate: Double, val left: List<PlanShift>, val planH: Double, val planNet: Double,
    val pots: List<PotNeed>, val potsWeek: Double, val potsFromWeek: Double, val covered: Double,
    val target: Double, val started: Boolean, val projected: Double, val room: Double, val perDay: Double, val short: Double, val extraH: Int,
    val keep: Double, val pc: Int, val advice: Advice,
    val taxSetAside: Boolean, val basDays: Int?, val showTaxLine: Boolean,
)

private val CAR_CATS = setOf("service", "tyres", "wash", "parking", "insurance", "rego")

/**
 * The read-time migrations of normalize() in src/1-core.js, on a copy (the stored document is never changed here):
 * a week's old `fuel` number and `extras` become daily entries, fuel logged as an Uber expense moves to the daily list,
 * and car expenses saved at 100 % (or with no %) follow the logbook % unless settings.bizAutoMig says that already ran.
 */
private fun normalized(src: JSONObject): JSONObject {
    val m = JSONObject(src.toString())
    val weeks = m.optJSONObject("weeks") ?: JSONObject().also { m.put("weeks", it) }
    val blankWeek = { id: String -> JSONObject().put("start", id).put("uberEarn", "").put("uberHours", "").put("fuel", "").put("cashHours", "").put("extras", JSONArray()).put("daily", JSONArray()).put("note", "") }
    val isId = Regex("^\\d{4}-\\d{2}-\\d{2}$")
    for (id in weeks.keys().asSequence().toList()) {
        val w = weeks.optJSONObject(id) ?: JSONObject().also { weeks.put(id, it) }
        if (w.optJSONArray("extras") == null) w.put("extras", JSONArray())
        if (w.optJSONArray("daily") == null) w.put("daily", JSONArray())
        if (!isId.matches(id)) continue
        w.put("start", id)
        val daily = w.getJSONArray("daily")
        val has = { did: String -> daily.objs().any { it.optString("id") == did } }
        val fv = w.opt("fuel")
        if (fv != null && fv != JSONObject.NULL && fv != "") {
            val f = when (fv) { is Number -> fv.toDouble(); is String -> fv.trim().let { if (it.isEmpty()) 0.0 else it.toDoubleOrNull() ?: Double.NaN }; is Boolean -> if (fv) 1.0 else 0.0; else -> Double.NaN }
            if (f.isFinite() && f > 0) {
                if (!has("mig-fuel-$id")) daily.put(JSONObject().put("id", "mig-fuel-$id").put("date", id).put("name", "Yakıt (Uber)").put("amount", r2(f)).put("cat", FUEL).put("migrated", true))
                w.put("fuel", "")
            }
        }
        val extras = w.getJSONArray("extras")
        if (extras.length() > 0) {
            for (i in 0 until extras.length()) {
                val x = extras.optJSONObject(i) ?: JSONObject()
                val a = r2(jnum(x.opt("amount")))
                if (a > 0 && !has("mig-x-$id-$i")) daily.put(JSONObject().put("id", "mig-x-$id-$i").put("date", id).put("name", x.optString("name").ifEmpty { "Harcama" }).put("amount", a).put("cat", JSONObject.NULL).put("oneOff", true).put("migrated", true))
            }
            w.put("extras", JSONArray())
        }
    }
    val ue = m.optJSONArray("uberExpenses")
    if (ue != null) {
        val keep = JSONArray()
        ue.objs().forEach { e ->
            val d = e.opt("d") as? String
            if (e.optString("cat") != "fuel" || d == null || !isId.matches(d)) { keep.put(e); return@forEach }
            val wid = mondayOf(LocalDate.parse(d)).toString()
            val amt = r2(jnum(e.opt("amount")))
            if (weeks.optJSONObject(wid) == null) weeks.put(wid, blankWeek(wid))
            val dup = weeks.keys().asSequence().toList().any { k ->
                weeks.optJSONObject(k)?.optJSONArray("daily").objs().any { it.optString("cat") == FUEL && it.optString("date") == d && abs(jnum(it.opt("amount")) - amt) < 0.005 }
            }
            if (!dup && amt > 0) weeks.getJSONObject(wid).getJSONArray("daily").put(
                JSONObject().put("id", "mig-ue-" + e.opt("id")).put("date", d).put("name", e.optString("note").ifEmpty { "Yakıt (Uber)" }).put("amount", amt).put("cat", FUEL).put("migrated", true),
            )
        }
        m.put("uberExpenses", keep)
    }
    val st = m.optJSONObject("settings") ?: JSONObject().also { m.put("settings", it) }
    if (!truthy(st.opt("bizAutoMig"))) {
        m.optJSONArray("uberExpenses").objs().forEach { e ->
            if (e.optString("cat") in CAR_CATS && (!e.has("biz") || e.isNull("biz") || jnum(e.opt("biz")) == 100.0)) e.put("bizAuto", true)
        }
        st.put("bizAutoMig", true)
    }
    return m
}

class Calc(src: JSONObject, private val today: LocalDate = LocalDate.now(), private val hour: Int = java.time.LocalTime.now().hour) {
    private val m = normalized(src)
    private val st = m.optJSONObject("settings") ?: JSONObject()
    private val weeks = m.optJSONObject("weeks") ?: JSONObject()
    private fun s(k: String, def: Double) = if (st.has(k)) jnum(st.opt(k)) else def

    private val salary = s("salary", 100000.0)
    private val fixed = s("fixed", 10000.0)
    private val weeksPerYear = s("weeksPerYear", 48.0)
    private val cover = truthy(st.opt("cover"))
    private val fuelDefault = s("fuelDefault", 180.0)
    private val cashRate = s("cashRate", 30.0)
    private val cashTaxOn = truthy(st.opt("cashTax"))
    private val recurring = sumAmt(st.optJSONArray("recurring"))
    private val logbook: Double = (st.opt("logbookPct").let { if (it == null || it == JSONObject.NULL) 100.0 else jnum(it) }).let { if (it > 0 && it <= 100) it else 100.0 }

    private val ids: List<String> = weeks.keys().asSequence().toList()
    private fun week(id: String): JSONObject? = weeks.optJSONObject(id)

    val thisWeekId: String = mondayOf(today).toString()
    private val todayId = today.toString()

    // ------------------------------------------------------------ weekCalc / calc (1-core.js)

    private class WC(val E: Double, val H: Double, val fuel: Double, val fx: Double, val gst: Double, val uberTax: Double, val uberNet: Double, val cashNet: Double, val salaryNet: Double, val rec: Double, val extra: Double, val income: Double, val left: Double)

    private fun weekCalc(E: Double, H: Double, fuelIn: Double?, cashHours: Double, extra: Double): WC {
        val N = max(1.0, weeksPerYear)
        val fuel = if (E > 0) (fuelIn ?: fuelDefault) else 0.0
        val fx = if (E > 0) fixed / N else 0.0
        val go = E / 11
        val gc = fuel / 11 + fx * 0.8 / 11
        val gst = go - gc
        val pa = max(0.0, ((E - go) - (fuel + fx - gc)) * N)
        val uberTax = (ttax(salary + pa, cover) - ttax(salary, cover)) / N
        val uberNet = E - gst - fuel - fx - uberTax
        val cashGross = cashHours * cashRate
        val cashA = cashGross * N
        val cashTax = if (cashTaxOn) (ttax(salary + pa + cashA, cover) - ttax(salary + pa, cover)) / N else 0.0
        val cashNet = cashGross - cashTax
        val salaryNet = (salary - ttax(salary, cover)) / 52
        val income = salaryNet + uberNet + cashNet
        return WC(E, H, fuel, fx, gst, uberTax, uberNet, cashNet, salaryNet, recurring, extra, income, income - recurring - extra)
    }

    private val calcMemo = HashMap<String, WeekNums>()

    fun calc(id: String): WeekNums = calcMemo.getOrPut(id) { calc0(id) }

    private fun calc0(id: String): WeekNums {
        val w = week(id) ?: JSONObject()
        val daily = w.optJSONArray("daily").objs()
        val fuelE = daily.filter { it.optString("cat") == FUEL }
        val spendE = daily.filter { it.optString("cat") != FUEL || it.isNull("cat") }
        val fuelSum = r2(fuelE.sumOf { jnum(it.opt("amount")) })
        val spend = r2(spendE.sumOf { jnum(it.opt("amount")) })
        val extras = sumAmt(w.optJSONArray("extras"))
        val E = jnum(w.opt("uberEarn"))
        val rawFuel = w.opt("fuel")
        val fuelIn: Double? = if (fuelE.isNotEmpty()) fuelSum else if ((rawFuel is Number && rawFuel.toDouble() == 0.0) || rawFuel == "0") 0.0 else null
        val fuelAsSpend = if (E > 0) 0.0 else fuelSum
        val outside = r2(spend + extras + fuelAsSpend)
        val c = weekCalc(E, jnum(w.opt("uberHours")), fuelIn, jnum(w.opt("cashHours")), outside)
        val tp = if (E > 0) weekTaxParts(id) else null
        var gst = c.gst
        var uberTax = c.uberTax
        var uberNet = c.uberNet
        var income = c.income
        var left = c.left
        var weekTax = if (E > 0) c.gst + c.uberTax else 0.0
        if (tp != null) {
            gst = tp.gst
            uberTax = tp.inc + tp.mls
            weekTax = tp.tax
            uberNet = c.E - gst - c.fuel - c.fx - uberTax
            income = c.salaryNet + uberNet + c.cashNet
            left = income - c.rec - c.extra
        }
        return WeekNums(c.E, c.H, c.fuel, c.fx, gst, uberTax, uberNet, c.cashNet, c.salaryNet, c.rec, c.extra, income, left, weekTax, r2(spend + fuelAsSpend))
    }

    // ------------------------------------------------------------ quarters and tax (5-tax.js)

    fun quarterOf(id: String): String {
        val d = LocalDate.parse(id)
        val m0 = d.monthValue - 1
        val fy = if (m0 >= 6) d.year + 1 else d.year
        val q = if (m0 in 6..8) 1 else if (m0 >= 9) 2 else if (m0 <= 2) 3 else 4
        return "$fy-Q$q"
    }

    fun qInfo(key: String): Quarter {
        val (fy, q) = key.split("-Q").map { it.toInt() }
        val sm = intArrayOf(6, 9, 0, 3)[q - 1]
        val y = if (q <= 2) fy - 1 else fy
        val start = LocalDate.of(y, sm + 1, 1)
        val end = start.plusMonths(3).minusDays(1)
        val due = when (q) {
            1 -> LocalDate.of(y, 11, 11)
            2 -> LocalDate.of(y + 1, 2, 28)
            3 -> LocalDate.of(y, 5, 12)
            else -> LocalDate.of(y, 8, 25)
        }
        return Quarter(key, fy, q, start, end, due)
    }

    private fun qShift(key: String, d: Int): String {
        var (fy, q) = key.split("-Q").map { it.toInt() }
        q += d
        while (q < 1) { q += 4; fy-- }
        while (q > 4) { q -= 4; fy++ }
        return "$fy-Q$q"
    }

    private fun bizOf(e: JSONObject): Double = when {
        truthy(e.opt("bizAuto")) -> logbook
        !e.has("biz") || e.isNull("biz") -> 100.0
        else -> jnum(e.opt("biz"))
    }

    private fun nearestUberWeek(ws: List<String>, d: String): String? {
        if (ws.isEmpty()) return null
        val day = try { LocalDate.parse(d) } catch (e: Exception) { return null }
        val own = mondayOf(day).toString()
        if (own in ws) return own
        val t = day.toEpochDay()
        var best: String? = null
        var bd = Long.MAX_VALUE
        for (id in ws) {
            val a = LocalDate.parse(id).toEpochDay()
            val b = a + 6
            val dist = if (t < a) a - t else if (t > b) t - b else 0
            if (dist < bd) { bd = dist; best = id }
        }
        return best
    }

    private val tqMemo = HashMap<String, TaxQ>()

    private fun taxQuarter(key: String): TaxQ = tqMemo.getOrPut(key) {
        val qi = qInfo(key)
        val a = qi.startId
        val b = qi.endId
        val ws = ids.filter { it in a..b && jnum(week(it)?.opt("uberEarn")) > 0 }.sorted()
        val E = ws.sumOf { jnum(week(it)?.opt("uberEarn")) }
        // (date, amount, business share 0..1, has GST)
        val ex = ArrayList<Triple<String, Double, Pair<Double, Boolean>>>()
        m.optJSONArray("uberExpenses").objs().forEach { e ->
            val d = e.opt("d") as? String ?: return@forEach
            if (d >= a && d <= b) ex.add(Triple(d, jnum(e.opt("amount")), bizOf(e) / 100 to truthy(e.opt("gst"))))
        }
        ids.forEach { wid ->
            week(wid)?.optJSONArray("daily").objs().forEach { x ->
                val d = x.opt("date") as? String
                if (x.optString("cat") == FUEL && d != null && d >= a && d <= b) ex.add(Triple(d, jnum(x.opt("amount")), logbook / 100 to true))
            }
        }
        val wk = LinkedHashMap<String, TaxBucket>()
        ws.forEach { wk[it] = TaxBucket(E = jnum(week(it)?.opt("uberEarn"))) }
        val loose = TaxBucket()
        var credit = 0.0
        var exEx = 0.0
        ex.forEach { (d, amt, bg) ->
            val (biz, hasGst) = bg
            val g = if (hasGst) amt / 11 else 0.0
            val cr = g * biz
            val xx = (amt - g) * biz
            credit += cr; exEx += xx
            val w = nearestUberWeek(ws, d)
            if (w != null) { wk[w]!!.credit += cr; wk[w]!!.exEx += xx } else { loose.credit += cr; loose.exEx += xx }
        }
        val sm = m.optJSONObject("taxSummaries")?.optJSONObject(key) ?: JSONObject()
        val exact = jnum(sm.opt("grossFares")) > 0
        val gross = if (exact) jnum(sm.opt("grossFares")) else E
        val fees = if (exact) jnum(sm.opt("uberFees")) else 0.0
        if (E > 0) ws.forEach { wk[it]!!.gross = gross * wk[it]!!.E / E; wk[it]!!.fees = fees * wk[it]!!.E / E } else { loose.gross = gross; loose.fees = fees }
        val g1A = gross / 11
        val g1B = credit + fees / 11
        val profit = (gross - gross / 11) - (fees - fees / 11) - exEx + (if (exact) jnum(sm.opt("tips")) else 0.0)
        TaxQ(key, ws, wk, loose, g1A - g1B, profit)
    }

    private val tsMemo = HashMap<String, TaxShare>()

    private fun taxShare(key: String): TaxShare = tsMemo.getOrPut(key) {
        val (fy, q) = key.split("-Q").map { it.toInt() }
        var P = 0.0
        var n = 0
        for (i in 1..q) { val x = taxQuarter("$fy-Q$i"); P += x.profit; n += x.weeks.size }
        val tq = taxQuarter(key)
        val N = max(1.0, if (weeksPerYear != 0.0) weeksPerYear else 48.0)
        val A = if (n > 0) P / n * N else P
        if (A <= 0 || tq.profit <= 0) return@getOrPut TaxShare(A, 0.0, 0.0, 0.0)
        val inc = (itax(salary + A) + 0.02 * (salary + A)) - (itax(salary) + 0.02 * salary)
        val mm = mls(salary + A, cover) - mls(salary, cover)
        TaxShare(A, inc / A, mm / A, inc / A * tq.profit + mm / A * tq.profit)
    }

    private fun taxPart(x: TaxBucket, ts: TaxShare): TaxParts {
        val gst = x.gross / 11 - x.credit - x.fees / 11
        val profit = (x.gross - x.gross / 11) - (x.fees - x.fees / 11) - x.exEx
        val inc = ts.rInc * profit
        val ml = ts.rMls * profit
        return TaxParts(gst, profit, inc, ml, gst + inc + ml)
    }

    fun weekTaxParts(id: String): TaxParts? {
        val w = week(id) ?: return null
        if (jnum(w.opt("uberEarn")) <= 0) return null
        val key = quarterOf(id)
        val x = taxQuarter(key).wk[id] ?: return null
        return taxPart(x, taxShare(key))
    }

    /** GST still owed for the quarter plus its income tax share (taxFull().need). */
    fun taxNeed(key: String) = taxQuarter(key).gst + taxShare(key).tax

    private fun nextBas(): Pair<String, Int>? {
        var q = qShift(quarterOf(thisWeekId), -1)
        repeat(3) {
            val d = ChronoUnit.DAYS.between(today, qInfo(q).due).toInt()
            if (d >= 0) return q to d
            q = qShift(q, 1)
        }
        return null
    }

    // ------------------------------------------------------------ accounts (4-accounts.js)

    private fun moneyOwed(): Pair<Double, Double> {
        val cur = quarterOf(thisWeekId)
        val (fy, q) = cur.split("-Q").map { it.toInt() }
        var gst = 0.0
        var tax = 0.0
        for (i in 1..q) {
            val k = "$fy-Q$i"
            tax += taxShare(k).tax
            if (qInfo(k).due.toString() >= todayId) gst += taxQuarter(k).gst
        }
        val pk = "${fy - 1}-Q4"
        if (qInfo(pk).due.toString() >= todayId) gst += taxQuarter(pk).gst
        return r2(gst) to r2(tax)
    }

    // ------------------------------------------------------------ plan (5-plan.js)

    private fun uberRate(): Double {
        var n = 0.0
        var h = 0.0
        ids.sortedDescending().take(8).forEach { id -> val c = calc(id); if (c.E > 0 && c.H > 0) { n += c.uberNet + c.fx; h += c.H } }
        return if (h >= 5) max(5.0, n / h) else 22.0
    }

    private val parts = mapOf("sabah" to ("Sabah" to 12), "aksam" to ("Akşam" to 23), "gun" to ("Tüm gün" to 21))

    private fun plannedLeft(): List<PlanShift> {
        val wd = today.dayOfWeek.value % 7 // Sun = 0, as Date.getDay()
        val order = { d: Int -> (d + 6) % 7 }
        return st.optJSONArray("uberPlan").objs().mapNotNull { s ->
            val sw = jnum(s.opt("wd")).toInt()
            val part = s.optString("part")
            val endH = (parts[part] ?: parts.getValue("gun")).second
            if (order(sw) > order(wd) || (sw == wd && hour < endH - 1)) PlanShift(sw, part, jnum(s.opt("h"))) else null
        }.sortedBy { order(it.wd) }
    }

    private fun potNeeds(): List<PotNeed> = m.optJSONArray("pots").objs().filter { p ->
        !truthy(p.opt("done")) && truthy(p.opt("due")) && jnum(p.opt("target")) > jnum(p.opt("saved"))
    }.map { p ->
        val due = try { LocalDate.parse(p.optString("due")) } catch (e: Exception) { today }
        val days = max(0, ChronoUnit.DAYS.between(today, due).toInt())
        val wks = max(1, ceil((days + 1) / 7.0).toInt())
        val need = jnum(p.opt("target")) - jnum(p.opt("saved"))
        val added = p.optJSONArray("log").objs().filter { l ->
            val d = l.opt("d") as? String
            jnum(l.opt("a")) > 0 && d != null && d >= thisWeekId && d <= todayId
        }.sumOf { jnum(it.opt("a")) }
        PotNeed(p.optString("name"), need / wks, added, days)
    }

    fun weekPlan(): WeekPlan {
        val id = thisWeekId
        val c = calc(id)
        val daysLeft = 7 - (today.dayOfWeek.value - 1)
        val rate = uberRate()
        val left = plannedLeft()
        val planH = left.sumOf { it.h }
        val planNet = planH * rate
        val pots = potNeeds()
        val potsWeek = pots.sumOf { max(0.0, it.perWeek - it.added) }
        var cover = 0.0
        val accounts = m.optJSONArray("accounts").objs()
        if (accounts.isNotEmpty()) {
            val tot = accounts.sumOf { jnum(it.opt("bal")) }
            val (gst, tax) = moneyOwed()
            val saved = m.optJSONArray("pots").objs().filter { !truthy(it.opt("done")) }.sumOf { jnum(it.opt("saved")) }
            cover = max(0.0, tot - gst - tax - saved)
        }
        val potsFromWeek = max(0.0, potsWeek - cover)
        val saveFrom = st.opt("saveFrom")
        val started = !truthy(saveFrom) || id >= (try { mondayOf(LocalDate.parse(saveFrom.toString())).toString() } catch (e: Exception) { "" })
        val target = if (started) s("saveTarget", 0.0) else 0.0
        val projected = c.left + planNet
        val room = projected - target - potsFromWeek
        val perDay = room / daysLeft
        val short = if (room < 0) -room else 0.0
        val extraH = if (short > 0) ceil(short / rate).toInt() else 0
        val keep = max(0.0, projected - potsFromWeek)
        val pc = if (target > 0) max(0, min(100, (keep / target * 100).roundToInt())) else 100
        val sa = m.optJSONArray("setAsides").objs().any { it.optString("week") == id }
        val bas = nextBas()
        val showTax = c.weekTax > 0 || (bas != null && taxNeed(bas.first) > 0.005)
        val advice = when {
            room < 0 -> Advice(
                2, "Bugün harcama yok",
                if (extraH <= 15) "Hedefe ${usd(short)} eksik: planın dışında ~$extraH saat Uber gerekiyor."
                else "Bu hafta hedefe ${usd(short)} eksik; plana göre ${usd(max(0.0, projected - potsFromWeek))} birikir. Harcamayı en aza indir.",
            )
            perDay >= 25 -> Advice(0, "Kahve de dışarıda yemek de olur", "Günde ${usd(perDay)} harcama alanın var, hedef ve kumbaralar ayrıldıktan sonra.")
            perDay >= 7 -> Advice(1, "Kahve olur, yemeği evde ye", "Günde ${usd(perDay)} harcama alanın var.")
            else -> Advice(2, "Bugün harcama yok", "Günde sadece ${usd(max(0.0, perDay))} alanın var; hedefi korumak için bugün harcama yapma.")
        }
        return WeekPlan(
            id, c, daysLeft, if (c.left > 0) c.left / daysLeft else 0.0,
            rate, left, planH, planNet, pots, potsWeek, potsFromWeek, potsWeek - potsFromWeek,
            target, started, projected, room, perDay, short, extraH, keep, pc, advice,
            sa, bas?.second, showTax,
        )
    }
}
