package app.momentum.next

import android.content.Context
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.text.NumberFormat
import java.time.DayOfWeek
import java.time.LocalDate
import java.time.temporal.TemporalAdjusters
import java.util.Locale
import kotlin.math.abs
import kotlin.math.roundToLong

data class Expense(val id: Long, val date: String, val name: String, val cat: String, val amount: Double)

/** A one-tap chip: a name the user logs often. amount == null means "ask for the amount". */
data class Quick(val name: String, val amount: Double?)

val CATS = listOf("Kahve", "Yemek", "Market", "Yakıt", "Fatura", "Diğer")

private val TR = Locale("tr", "TR")

fun money(v: Double): String {
    val n = NumberFormat.getIntegerInstance(TR).format(abs(v).roundToLong())
    return (if (v < -0.5) "−$" else "$") + n
}

/**
 * Local data for the native app, kept as one JSON file in the app's private storage.
 * Milestone 1 is offline only; sync with the existing Supabase documents comes next.
 */
class Store(ctx: Context) {
    private val file = File(ctx.filesDir, "momentum.json")

    var expenses by mutableStateOf(listOf<Expense>())
        private set
    var target by mutableStateOf(0.0)
        private set
    var weeklyIncome by mutableStateOf(0.0)
        private set

    init {
        load()
    }

    val weekStart: LocalDate
        get() = LocalDate.now().with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY))

    val weekExpenses: List<Expense>
        get() {
            val from = weekStart.toString()
            return expenses.filter { it.date >= from }
        }

    val spent: Double get() = weekExpenses.sumOf { it.amount }
    val kept: Double get() = weeklyIncome - spent

    /** Spending this week by category, largest first. */
    val byCat: List<Pair<String, Double>>
        get() = weekExpenses.groupBy { it.cat }
            .map { (k, v) -> k to v.sumOf { it.amount } }
            .sortedByDescending { it.second }

    /** The name + amount pairs logged most often, padded with plain categories. */
    val quick: List<Quick>
        get() {
            val frequent = expenses.groupBy { it.name to it.amount }
                .filter { it.value.size >= 2 }
                .entries.sortedByDescending { it.value.size }
                .map { Quick(it.key.first, it.key.second) }
                .distinctBy { it.name }
                .take(2)
            val rest = CATS.filter { c -> frequent.none { it.name == c } }.map { Quick(it, null) }
            return (frequent + rest).take(4)
        }

    fun add(name: String, cat: String, amount: Double): Expense {
        val e = Expense(System.currentTimeMillis(), LocalDate.now().toString(), name, cat, amount)
        expenses = listOf(e) + expenses
        save()
        return e
    }

    fun remove(id: Long) {
        expenses = expenses.filter { it.id != id }
        save()
    }

    fun setPlan(income: Double, goal: Double) {
        weeklyIncome = income
        target = goal
        save()
    }

    private fun load() {
        if (!file.exists()) return
        try {
            val o = JSONObject(file.readText())
            target = o.optDouble("target", 0.0)
            weeklyIncome = o.optDouble("weeklyIncome", 0.0)
            val a = o.optJSONArray("expenses") ?: JSONArray()
            val out = ArrayList<Expense>()
            for (i in 0 until a.length()) {
                val x = a.getJSONObject(i)
                out.add(Expense(x.getLong("id"), x.getString("date"), x.optString("name"), x.optString("cat", "Diğer"), x.optDouble("amount", 0.0)))
            }
            expenses = out
        } catch (e: Exception) {
            // a broken file must not stop the app from opening; keep it aside for recovery
            file.copyTo(File(file.parentFile, "momentum.broken.json"), overwrite = true)
        }
    }

    private fun save() {
        val a = JSONArray()
        expenses.forEach { e ->
            a.put(JSONObject().put("id", e.id).put("date", e.date).put("name", e.name).put("cat", e.cat).put("amount", e.amount))
        }
        val o = JSONObject().put("v", 1).put("target", target).put("weeklyIncome", weeklyIncome).put("expenses", a)
        val tmp = File(file.parentFile, "momentum.json.tmp")
        tmp.writeText(o.toString())
        tmp.renameTo(file)
    }
}
