package app.momentum.next

import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.ZoneId

/** Shift rules must match submitShift / weekShifts in src/5-logbook.js. All data here is made up. */
class ShiftsTest {
    private val zone = ZoneId.of("Australia/Brisbane")
    private fun at(s: String) = LocalDateTime.parse(s).atZone(zone).toInstant().toEpochMilli()
    private val now = at("2026-03-11T18:00")

    private fun doc() = JSONObject(
        """{"settings":{"saveTarget":500},"trips":[{"id":"a","start":${at("2026-03-09T08:00")},"end":${at("2026-03-09T12:30")},"kmStart":50000,"kmEnd":50120}],
           "odo":[{"id":"o","ts":${at("2026-03-10T09:00")},"km":50200}],"lb":{"startTs":${at("2026-03-01T00:00")},"odoStart":49000,"vehicle":"Test"},"accounts":[{"id":"x"}]}""",
    )

    private fun start(id: String, ts: Long, km: Long) = JSONObject().put("op", "tripStart").put("t", JSONObject().put("id", id).put("start", ts).put("kmStart", km))
    private fun end(id: String, ts: Long, km: Long) = JSONObject().put("op", "tripEnd").put("id", id).put("end", ts).put("kmEnd", km)

    @Test
    fun startAndEndKeepTheRestOfTheDocument() {
        val d = doc()
        assertNull(shiftError(d, false, 50250, now, now, zone))
        assertTrue(applyTripOp(d, start("b", now, 50250)))
        val o = openShift(d)!!
        assertEquals("b", o.id)
        assertTrue(d.getJSONArray("trips").getJSONObject(1).isNull("end"))
        assertNull(shiftError(d, true, 50330, now + 3_600_000, now + 3_600_000, zone))
        applyTripOp(d, end("b", now + 3_600_000, 50330))
        assertNull(openShift(d))
        assertEquals(80.0, shiftsOf(d)[1].km, 0.0)
        assertEquals(500, d.getJSONObject("settings").getInt("saveTarget"))
        assertEquals(1, d.getJSONArray("accounts").length())
        assertEquals("Test", d.getJSONObject("lb").getString("vehicle"))
    }

    @Test
    fun replayIsHarmless() {
        val d = doc()
        repeat(2) { applyTripOp(d, start("b", now, 50250)) }
        assertEquals(2, d.getJSONArray("trips").length())
        applyTripOp(d, start("c", now + 1000, 50260)) // another shift is open: skipped
        assertEquals(2, d.getJSONArray("trips").length())
        repeat(2) { applyTripOp(d, end("b", now + 60_000, 50260)) }
        applyTripOp(d, end("b", now + 999_000, 59999)) // already closed: unchanged
        assertEquals(50260.0, shiftsOf(d)[1].kmEnd!!, 0.0)
        applyTripOp(d, JSONObject().put("op", "tripCancel").put("id", "b")) // finished shifts are never dropped
        applyTripOp(d, JSONObject().put("op", "tripCancel").put("id", "a"))
        assertEquals(2, d.getJSONArray("trips").length())
        assertFalse(applyTripOp(d, JSONObject().put("op", "add")))
    }

    @Test
    fun cancelDropsOnlyTheOpenShift() {
        val d = doc()
        applyTripOp(d, start("b", now, 50250))
        applyTripOp(d, JSONObject().put("op", "tripCancel").put("id", "b"))
        assertEquals(1, d.getJSONArray("trips").length())
        assertEquals("a", shiftsOf(d)[0].id)
    }

    @Test
    fun validation() {
        val d = doc()
        assertNotNull(shiftError(d, false, null, now, now, zone))
        assertNotNull(shiftError(d, false, 50199, now, now, zone)) // below the last reading (50 200)
        assertNull(shiftError(d, false, 50200, now, now, zone))
        assertNotNull(shiftError(d, false, 50300, now + 10 * 60000, now, zone)) // future
        assertNotNull(shiftError(d, true, 50300, now, now, zone)) // nothing open
        applyTripOp(d, start("b", now, 50250))
        assertNotNull(shiftError(d, false, 50300, now, now, zone)) // already open
        assertNotNull(shiftError(d, true, 50300, now, now, zone)) // end must be after start
        assertNotNull(shiftError(d, true, 50249, now + 60000, now + 60000, zone))
        assertNotNull(shiftError(d, true, 51751, now + 60000, now + 60000, zone)) // > 1 500 km
        assertNull(shiftError(d, true, 50250, now + 60000, now + 60000, zone))
    }

    @Test
    fun weekTotalsAndStale() {
        val d = doc()
        val w = weekShifts(d, LocalDate.parse("2026-03-09"), zone)
        assertEquals(1, w.n)
        assertEquals(120.0, w.km, 0.0)
        assertEquals(4.5 * 3_600_000, w.ms.toDouble(), 0.0)
        assertEquals(0, weekShifts(d, LocalDate.parse("2026-03-02"), zone).n)
        assertEquals(50200.0, lastOdo(d)!!.second, 0.0)
        applyTripOp(d, start("b", at("2026-03-10T20:00"), 50250))
        assertFalse(isStale(openShift(d), at("2026-03-10T23:59"), zone))
        assertFalse(isStale(openShift(d), at("2026-03-11T01:00"), zone)) // past midnight but under 6 hours
        assertTrue(isStale(openShift(d), at("2026-03-11T09:00"), zone))
        assertEquals("45 dk", durTxt(45 * 60000L))
        assertEquals("2 sa", durTxt(120 * 60000L))
        assertEquals("1 sa 20 dk", durTxt(80 * 60000L))
    }
}
