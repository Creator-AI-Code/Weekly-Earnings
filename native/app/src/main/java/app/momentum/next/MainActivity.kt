package app.momentum.next

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.LinearOutSlowInEasing
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.ShoppingCart
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExtendedFloatingActionButton
import androidx.compose.material3.FilledTonalButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarDuration
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.SnackbarResult
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.clipRect
import androidx.compose.ui.graphics.drawscope.rotate
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.launch
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.util.Locale
import kotlin.math.PI
import kotlin.math.cos
import kotlin.math.roundToInt
import kotlin.math.sin

private val Gold = Color(0xFFDDB25A)
private val Hero = Color(0xFF18181B)
private val HeroTrack = Color(0xFF3A3A40)
private val HeroInk2 = Color(0xFFD4D4D8)
private val Gain = Color(0xFF4ADE80)
private val FlowColors = listOf(Color(0xFFFF8A80), Color(0xFF93C5FD), Color(0xFFA1A1AA), Color(0xFFF0ABFC), Color(0xFFFCD34D), Color(0xFF5EEAD4))

private val LightColors = lightColorScheme(
    primary = Color(0xFF18181B), onPrimary = Color.White,
    secondaryContainer = Color(0xFFE4E4E7), onSecondaryContainer = Color(0xFF111114),
    background = Color(0xFFF6F6F7), onBackground = Color(0xFF111114),
    surface = Color.White, onSurface = Color(0xFF111114),
    surfaceVariant = Color(0xFFECECEF), onSurfaceVariant = Color(0xFF5A5A64),
    outline = Color(0xFF82828C),
)
private val DarkColors = darkColorScheme(
    primary = Color(0xFFF4F4F5), onPrimary = Color(0xFF18181B),
    secondaryContainer = Color(0xFF303036), onSecondaryContainer = Color(0xFFF4F4F5),
    background = Color(0xFF0C0C0E), onBackground = Color(0xFFF4F4F5),
    surface = Color(0xFF17171A), onSurface = Color(0xFFF4F4F5),
    surfaceVariant = Color(0xFF222226), onSurfaceVariant = Color(0xFFA1A1AA),
    outline = Color(0xFF6E6E78),
)

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        val store = Store(applicationContext)
        setContent {
            MaterialTheme(colorScheme = if (isSystemInDarkTheme()) DarkColors else LightColors) {
                App(store)
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun App(store: Store) {
    var tab by remember { mutableStateOf(0) }
    var sheetFor by remember { mutableStateOf<String?>(null) } // category the add-sheet opens with, null = closed
    var settings by remember { mutableStateOf(false) }
    val snack = remember { SnackbarHostState() }
    val scope = rememberCoroutineScope()
    val haptic = LocalHapticFeedback.current

    fun log(name: String, cat: String, amount: Double) {
        val e = store.add(name, cat, amount)
        haptic.performHapticFeedback(HapticFeedbackType.LongPress)
        scope.launch {
            snack.currentSnackbarData?.dismiss()
            val r = snack.showSnackbar("$name ${money(amount)} kaydedildi", actionLabel = "Geri al", duration = SnackbarDuration.Short)
            if (r == SnackbarResult.ActionPerformed) store.remove(e.id)
        }
    }

    Scaffold(
        containerColor = MaterialTheme.colorScheme.background,
        snackbarHost = { SnackbarHost(snack) },
        floatingActionButton = {
            ExtendedFloatingActionButton(
                onClick = { sheetFor = CATS[0] },
                icon = { Icon(Icons.Filled.Add, contentDescription = null) },
                text = { Text("Gider ekle", fontWeight = FontWeight.Bold) },
                containerColor = MaterialTheme.colorScheme.primary,
                contentColor = MaterialTheme.colorScheme.onPrimary,
            )
        },
        bottomBar = {
            NavigationBar(containerColor = MaterialTheme.colorScheme.surface) {
                NavigationBarItem(selected = tab == 0, onClick = { tab = 0 }, icon = { Icon(Icons.Filled.Home, contentDescription = null) }, label = { Text("Bugün") })
                NavigationBarItem(selected = tab == 1, onClick = { tab = 1 }, icon = { Icon(Icons.Filled.ShoppingCart, contentDescription = null) }, label = { Text("Para") })
            }
        },
    ) { pad ->
        Box(Modifier.fillMaxSize().padding(pad)) {
            if (tab == 0) {
                Today(store, onQuick = { q -> if (q.amount != null) log(q.name, catOf(q.name), q.amount) else sheetFor = catOf(q.name) }, onSettings = { settings = true })
            } else {
                Para(store)
            }
        }
    }

    val open = sheetFor
    if (open != null) {
        ModalBottomSheet(onDismissRequest = { sheetFor = null }, containerColor = MaterialTheme.colorScheme.surface) {
            AddSheet(startCat = open, onSave = { cat, amount -> sheetFor = null; log(cat, cat, amount) })
        }
    }
    if (settings) {
        PlanDialog(store.weeklyIncome, store.target, onDismiss = { settings = false }, onSave = { inc, goal -> store.setPlan(inc, goal); settings = false })
    }
}

private fun catOf(name: String): String = if (name in CATS) name else "Diğer"

// ---------------------------------------------------------------- Today

@Composable
fun Today(store: Store, onQuick: (Quick) -> Unit, onSettings: () -> Unit) {
    val target = store.target
    val kept = store.kept
    val pc = if (target > 0) (kept / target).toFloat().coerceIn(0f, 1f) else 0f
    val reached = target > 0 && kept >= target
    val recent = store.expenses.take(6)
    val today = LocalDate.now()

    LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 12.dp, bottom = 96.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        item(key = "head") {
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    Text("Bugün", fontSize = 28.sp, fontWeight = FontWeight.ExtraBold, color = MaterialTheme.colorScheme.onBackground)
                    Text(today.format(DateTimeFormatter.ofPattern("EEEE, d MMMM", Locale("tr", "TR"))), fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                IconButton(onClick = onSettings) { Icon(Icons.Filled.Settings, contentDescription = "Hedef ve gelir", tint = MaterialTheme.colorScheme.onBackground) }
            }
        }
        item(key = "hero") {
            Box {
                Row(
                    Modifier.fillMaxWidth().clip(RoundedCornerShape(22.dp)).background(Hero).padding(16.dp),
                    verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(14.dp),
                ) {
                    GoalRing(pc, reached)
                    Column {
                        Text(if (target > 0) "Bu hafta birikim · hedef ${money(target)}" else "Bu hafta elinde kalan", fontSize = 13.sp, color = HeroInk2)
                        CountMoney(kept, fontSize = 38, color = Color.White)
                        Text(
                            when {
                                target <= 0 -> "Hedef koymak için ayarlara dokun."
                                reached -> "Hedef tamam! Harika iş."
                                pc >= 0.85f -> "Son düzlük: ${money(target - kept)} kaldı."
                                pc >= 0.6f -> "İyi gidiyorsun: ${money(target - kept)} kaldı."
                                else -> "Her dolar sayılır: ${money(target - kept)} kaldı."
                            },
                            fontSize = 14.sp, fontWeight = FontWeight.SemiBold, color = if (reached) Gold else Color(0xFFB4E39C),
                        )
                    }
                }
                Confetti(reached, Modifier.matchParentSize())
            }
        }
        item(key = "quickTitle") { SectionTitle("Tek dokunuşla ekle", "sık girdiklerin") }
        item(key = "quick") {
            val chips = store.quick
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                chips.chunked(2).forEach { row ->
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        row.forEach { q ->
                            OutlinedButton(onClick = { onQuick(q) }, modifier = Modifier.weight(1f).height(52.dp), shape = RoundedCornerShape(14.dp), contentPadding = PaddingValues(horizontal = 14.dp)) {
                                Text(q.name, Modifier.weight(1f), fontWeight = FontWeight.SemiBold, fontSize = 15.sp, color = MaterialTheme.colorScheme.onSurface)
                                Text(q.amount?.let { money(it) } ?: "tutar yaz", fontWeight = FontWeight.Bold, fontSize = 14.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                        }
                        if (row.size == 1) Spacer(Modifier.weight(1f))
                    }
                }
            }
        }
        item(key = "recentTitle") { SectionTitle("Son girişler", if (recent.isEmpty()) "henüz yok" else "") }
        items(recent, key = { it.id }) { e ->
            Row(
                Modifier.animateItem().fillMaxWidth().clip(RoundedCornerShape(14.dp)).background(MaterialTheme.colorScheme.surfaceVariant).padding(horizontal = 14.dp, vertical = 13.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(e.name, Modifier.weight(1f), fontWeight = FontWeight.SemiBold, fontSize = 15.sp, color = MaterialTheme.colorScheme.onSurface)
                Text(if (e.date == today.toString()) "Bugün" else LocalDate.parse(e.date).format(DateTimeFormatter.ofPattern("EEE", Locale("tr", "TR"))), fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Spacer(Modifier.width(12.dp))
                Text(money(e.amount), fontWeight = FontWeight.Bold, fontSize = 15.sp, color = MaterialTheme.colorScheme.onSurface)
            }
        }
    }
}

@Composable
fun SectionTitle(title: String, hint: String) {
    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.Bottom) {
        Text(title, Modifier.weight(1f), fontSize = 15.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onBackground)
        if (hint.isNotEmpty()) Text(hint, fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}

/** A number that counts to its new value instead of jumping. */
@Composable
fun CountMoney(value: Double, fontSize: Int, color: Color) {
    var shown by remember { mutableStateOf(0f) }
    LaunchedEffect(value) { shown = value.toFloat() }
    val v by animateFloatAsState(shown, tween(700, easing = FastOutSlowInEasing), label = "money")
    Text(money(v.toDouble()), fontSize = fontSize.sp, fontWeight = FontWeight.ExtraBold, color = color)
}

@Composable
fun GoalRing(pc: Float, gold: Boolean) {
    var shown by remember { mutableStateOf(0f) }
    LaunchedEffect(pc) { shown = pc }
    val p by animateFloatAsState(shown, tween(900, easing = FastOutSlowInEasing), label = "ring")
    val color by animateColorAsState(if (gold) Gold else Color.White, label = "ringColor")
    Box(Modifier.size(96.dp), contentAlignment = Alignment.Center) {
        Canvas(Modifier.fillMaxSize()) {
            val sw = 10.dp.toPx()
            val tl = Offset(sw / 2, sw / 2)
            val sz = Size(size.width - sw, size.height - sw)
            drawArc(HeroTrack, 0f, 360f, false, topLeft = tl, size = sz, style = Stroke(sw))
            if (p > 0.001f) drawArc(color, -90f, 360f * p, false, topLeft = tl, size = sz, style = Stroke(sw, cap = StrokeCap.Round))
        }
        Text("%" + (p * 100).roundToInt(), color = Color.White, fontWeight = FontWeight.Bold, fontSize = 20.sp)
    }
}

/** A one-shot burst when the weekly goal is reached. */
@Composable
fun Confetti(play: Boolean, modifier: Modifier) {
    val t = remember { Animatable(0f) }
    LaunchedEffect(play) {
        if (play) {
            t.snapTo(0f)
            t.animateTo(1f, tween(1600, delayMillis = 700, easing = LinearOutSlowInEasing))
        }
    }
    val k = t.value
    if (k <= 0f || k >= 1f) return
    val colors = listOf(Gold, Gain, Color.White)
    Canvas(modifier) {
        val cx = 64.dp.toPx()
        val cy = size.height / 2
        for (i in 0 until 28) {
            val a = (i / 28f) * 2f * PI.toFloat()
            val d = (70 + (i % 4) * 38).dp.toPx() * k
            val x = cx + cos(a) * d
            val y = cy + sin(a) * d + 90.dp.toPx() * k * k
            rotate(k * (200f + i * 30f), Offset(x, y)) {
                drawRect(colors[i % 3], Offset(x - 4.dp.toPx(), y - 6.dp.toPx()), Size(8.dp.toPx(), 12.dp.toPx()), alpha = 1f - k)
            }
        }
    }
}

// ---------------------------------------------------------------- Add sheet

@Composable
fun AddSheet(startCat: String, onSave: (String, Double) -> Unit) {
    var amt by remember { mutableStateOf("") }
    var cat by remember { mutableStateOf(startCat) }
    val haptic = LocalHapticFeedback.current
    val value = amt.replace(',', '.').toDoubleOrNull() ?: 0.0
    val ready = value > 0

    fun tap(k: String) {
        haptic.performHapticFeedback(HapticFeedbackType.TextHandleMove)
        amt = when {
            k == "⌫" -> amt.dropLast(1)
            k == "," -> if (amt.contains(',')) amt else (if (amt.isEmpty()) "0" else amt) + ","
            amt.replace(",", "").length >= 6 -> amt
            amt == "0" -> k
            else -> amt + k
        }
    }

    Column(Modifier.fillMaxWidth().navigationBarsPadding().padding(start = 16.dp, end = 16.dp, bottom = 16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Text("$" + amt.ifEmpty { "0" }, Modifier.fillMaxWidth(), textAlign = TextAlign.Center, fontSize = 52.sp, fontWeight = FontWeight.ExtraBold, color = if (ready) MaterialTheme.colorScheme.onSurface else MaterialTheme.colorScheme.outline)
        CATS.chunked(3).forEach { row ->
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                row.forEach { c ->
                    val on = c == cat
                    Surface(
                        onClick = { cat = c }, modifier = Modifier.weight(1f).height(44.dp), shape = RoundedCornerShape(12.dp),
                        color = if (on) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.surface,
                        contentColor = if (on) MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.onSurface,
                        border = androidx.compose.foundation.BorderStroke(1.5.dp, if (on) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outline),
                    ) {
                        Box(contentAlignment = Alignment.Center) { Text(c, fontWeight = FontWeight.Bold, fontSize = 14.sp) }
                    }
                }
            }
        }
        listOf(listOf("1", "2", "3"), listOf("4", "5", "6"), listOf("7", "8", "9"), listOf(",", "0", "⌫")).forEach { row ->
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                row.forEach { k ->
                    FilledTonalButton(
                        onClick = { tap(k) }, modifier = Modifier.weight(1f).height(54.dp), shape = RoundedCornerShape(14.dp),
                        colors = ButtonDefaults.filledTonalButtonColors(containerColor = MaterialTheme.colorScheme.surfaceVariant, contentColor = MaterialTheme.colorScheme.onSurface),
                    ) { Text(k, fontSize = 24.sp, fontWeight = FontWeight.Bold) }
                }
            }
        }
        Button(onClick = { if (ready) onSave(cat, value) }, enabled = ready, modifier = Modifier.fillMaxWidth().height(56.dp), shape = RoundedCornerShape(18.dp)) {
            Text(if (ready) "$cat olarak kaydet" else "Tutarı yaz", fontSize = 17.sp, fontWeight = FontWeight.Bold)
        }
    }
}

@Composable
fun PlanDialog(income: Double, goal: Double, onDismiss: () -> Unit, onSave: (Double, Double) -> Unit) {
    var inc by remember { mutableStateOf(if (income > 0) income.roundToInt().toString() else "") }
    var tgt by remember { mutableStateOf(if (goal > 0) goal.roundToInt().toString() else "") }
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Haftalık plan") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                OutlinedTextField(inc, { inc = it.filter(Char::isDigit) }, label = { Text("Haftalık net gelir ($)") }, singleLine = true, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number))
                OutlinedTextField(tgt, { tgt = it.filter(Char::isDigit) }, label = { Text("Haftalık birikim hedefi ($)") }, singleLine = true, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number))
            }
        },
        confirmButton = { TextButton(onClick = { onSave(inc.toDoubleOrNull() ?: 0.0, tgt.toDoubleOrNull() ?: 0.0) }) { Text("Kaydet") } },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Vazgeç") } },
    )
}

// ---------------------------------------------------------------- Para

@Composable
fun Para(store: Store) {
    val income = store.weeklyIncome
    val kept = store.kept
    val byCat = store.byCat
    val targets = buildList {
        if (kept > 0) add(Triple("Elinde kalan", kept, Gold))
        byCat.forEachIndexed { i, (n, v) -> add(Triple(n, v, FlowColors[i % FlowColors.size])) }
    }
    LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 12.dp, bottom = 96.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        item {
            Text("Para", fontSize = 28.sp, fontWeight = FontWeight.ExtraBold, color = MaterialTheme.colorScheme.onBackground)
            Text("Bu hafta", fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        item {
            Column(Modifier.fillMaxWidth().clip(RoundedCornerShape(18.dp)).background(MaterialTheme.colorScheme.surface).padding(16.dp)) {
                Text("Elinde kalan", fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                CountMoney(kept, fontSize = 40, color = MaterialTheme.colorScheme.onSurface)
                Text("Gelir ${money(income)} · Gider ${money(store.spent)}", fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }
        item {
            Column(Modifier.fillMaxWidth().clip(RoundedCornerShape(22.dp)).background(Hero).padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Row(verticalAlignment = Alignment.Bottom) {
                    Text("Para akışı", Modifier.weight(1f), fontSize = 15.sp, fontWeight = FontWeight.Bold, color = Color.White)
                    Text("gelir → nereye gitti", fontSize = 12.sp, color = HeroInk2)
                }
                if (targets.isEmpty()) {
                    Text("Gelirini ve ilk giderini girince akış burada görünür.", fontSize = 14.sp, color = HeroInk2)
                } else {
                    MoneyFlow(targets, Modifier.fillMaxWidth().height(220.dp))
                    targets.forEach { (name, v, col) ->
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Box(Modifier.size(10.dp).clip(CircleShape).background(col))
                            Spacer(Modifier.width(8.dp))
                            Text(name, Modifier.weight(1f), fontSize = 14.sp, fontWeight = FontWeight.SemiBold, color = Color.White)
                            Text(money(v), fontSize = 14.sp, fontWeight = FontWeight.Bold, color = Color.White)
                        }
                    }
                }
            }
        }
    }
}

/** Income on the left flowing into where it went on the right, with moving dashes along each band. */
@Composable
fun MoneyFlow(targets: List<Triple<String, Double, Color>>, modifier: Modifier) {
    val phase by rememberInfiniteTransition(label = "flow").animateFloat(0f, 14f, infiniteRepeatable(tween(900, easing = LinearEasing)), label = "phase")
    var started by remember { mutableStateOf(false) }
    LaunchedEffect(Unit) { started = true }
    val reveal by animateFloatAsState(if (started) 1f else 0f, tween(1200, easing = FastOutSlowInEasing), label = "reveal")
    val total = targets.sumOf { it.second }

    Canvas(modifier) {
        if (total <= 0.0) return@Canvas
        val nodeW = 8.dp.toPx()
        val gap = 6.dp.toPx()
        val r = CornerRadius(3.dp.toPx())
        val h = size.height - gap * (targets.size - 1)
        val x0 = nodeW + 4.dp.toPx()
        val x1 = size.width - nodeW - 4.dp.toPx()
        val mx = (x0 + x1) / 2
        drawRoundRect(Color(0xFFE4E4E7), Offset(0f, 0f), Size(nodeW, h), r)
        var ly = 0f
        var ry = 0f
        targets.forEach { (_, v, col) ->
            val th = (v / total * h).toFloat()
            drawRoundRect(col, Offset(size.width - nodeW, ry), Size(nodeW, th), r)
            val band = Path().apply {
                moveTo(x0, ly); cubicTo(mx, ly, mx, ry, x1, ry)
                lineTo(x1, ry + th); cubicTo(mx, ry + th, mx, ly + th, x0, ly + th); close()
            }
            val mid = Path().apply { moveTo(x0, ly + th / 2); cubicTo(mx, ly + th / 2, mx, ry + th / 2, x1, ry + th / 2) }
            clipRect(right = size.width * reveal) {
                drawPath(band, col, alpha = 0.26f)
                drawPath(
                    mid, col,
                    style = Stroke(2.5.dp.toPx(), cap = StrokeCap.Round, pathEffect = PathEffect.dashPathEffect(floatArrayOf(4.dp.toPx(), 10.dp.toPx()), -phase.dp.toPx())),
                )
            }
            ly += th
            ry += th + gap
        }
    }
}
