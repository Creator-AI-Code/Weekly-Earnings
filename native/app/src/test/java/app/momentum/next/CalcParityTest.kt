package app.momentum.next

import org.json.JSONObject
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File
import java.time.LocalDateTime
import kotlin.math.abs

/**
 * Calc.kt must give the same numbers as the web app. For every native/parity/fixtures/<name>.json the expected values in
 * native/parity/expected/<name>.json come from the web app's own code (node native/parity/web-engine.js <fixture>).
 * Set PARITY_DIR to a folder with the same fixtures/ + expected/ layout to also check private data kept outside the repo.
 */
class CalcParityTest {
    private val root = listOf(File("../parity"), File("parity"), File("native/parity")).first { it.isDirectory }

    private fun pairs(dir: File) = dir.resolve("fixtures").listFiles { f -> f.extension == "json" }.orEmpty().sortedBy { it.name }.map { it to dir.resolve("expected/${it.name}") }

    @Test
    fun matchesWebEngine() {
        val all = pairs(root) + (System.getenv("PARITY_DIR")?.let { File(it) }?.takeIf { it.isDirectory }?.let { pairs(it) } ?: emptyList())
        assertTrue("no fixtures found in $root", all.isNotEmpty())
        val fails = all.flatMap { (fx, ex) -> check(fx.name, JSONObject(fx.readText()), JSONObject(ex.readText())) }
        println("parity: ${all.size} fixtures, ${fails.size} mismatches")
        assertTrue(fails.joinToString("\n"), fails.isEmpty())
    }

    private fun check(name: String, fixture: JSONObject, expected: JSONObject): List<String> {
        val at = LocalDateTime.parse(fixture.getString("at"))
        val p = Calc(fixture.optJSONObject("money") ?: JSONObject(), at.toLocalDate(), at.hour).weekPlan()
        val c = p.c
        val got = mapOf<String, Any?>(
            "weekId" to p.weekId, "daysLeft" to p.daysLeft, "perDaySafe" to p.perDaySafe,
            "E" to c.E, "H" to c.H, "fuel" to c.fuel, "fx" to c.fx, "gst" to c.gst, "uberTax" to c.uberTax, "uberNet" to c.uberNet,
            "cashNet" to c.cashNet, "salaryNet" to c.salaryNet, "rec" to c.rec, "extra" to c.extra, "income" to c.income, "left" to c.left,
            "weekTax" to c.weekTax, "daily" to c.daily,
            "rate" to p.rate, "planH" to p.planH, "planNet" to p.planNet, "potsWeek" to p.potsWeek, "potsFromWeek" to p.potsFromWeek,
            "target" to p.target, "projected" to p.projected, "room" to p.room, "perDay" to p.perDay, "short" to p.short, "extraH" to p.extraH,
            "keep" to p.keep, "pc" to p.pc, "advice" to p.advice.title, "taxSetAside" to p.taxSetAside, "basDays" to p.basDays,
        )
        val out = ArrayList<String>()
        for (k in expected.keys()) {
            if (k !in got) { out.add("$name: no Kotlin value for '$k'"); continue }
            val e = expected.opt(k)
            val g = got[k]
            val same = when {
                e == JSONObject.NULL -> g == null
                e is Number && g is Number -> abs(e.toDouble() - g.toDouble()) < 0.005
                else -> e.toString() == g.toString()
            }
            if (!same) out.add("$name: $k web=$e kotlin=$g")
        }
        return out
    }
}
