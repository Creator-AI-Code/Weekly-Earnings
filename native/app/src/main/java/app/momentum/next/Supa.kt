package app.momentum.next

import android.content.Context
import org.json.JSONObject
import java.io.IOException
import java.net.HttpURLConnection
import java.net.URL

/** The same Supabase project and publishable key as the web app (src/5-sync.js). Never a secret key here. */
private const val SB_URL = "https://xauhwvoqfavngiphfueh.supabase.co"
private const val SB_KEY = "sb_publishable_zolMrSzkgMnwMcbBaoAhKQ_BFRORcpl"

class SbError(val status: Int, val code: String?, msg: String, val network: Boolean = false) : Exception(msg)

data class Session(val access: String, val refresh: String, val expiresAt: Long, val userId: String, val email: String)

/** A tiny GoTrue + PostgREST client on plain HttpURLConnection. All calls block: run them on Dispatchers.IO. */
class Supa(ctx: Context) {
    private val prefs = ctx.getSharedPreferences("sync", Context.MODE_PRIVATE)

    val deviceId: String = prefs.getString("deviceId", null) ?: ("n" + System.currentTimeMillis().toString(36) + (100000..999999).random().toString(36)).also {
        prefs.edit().putString("deviceId", it).apply()
    }

    var session: Session? = loadSession()
        private set

    var lastEmail: String
        get() = prefs.getString("lastEmail", "") ?: ""
        set(v) = prefs.edit().putString("lastEmail", v).apply()

    private fun loadSession(): Session? {
        val s = prefs.getString("session", null) ?: return null
        return try {
            val o = JSONObject(s)
            Session(o.getString("access"), o.getString("refresh"), o.getLong("exp"), o.getString("uid"), o.optString("email"))
        } catch (e: Exception) { null }
    }

    private fun setSession(j: JSONObject) {
        val u = j.getJSONObject("user")
        val exp = if (j.has("expires_at")) j.getLong("expires_at") else System.currentTimeMillis() / 1000 + j.optLong("expires_in", 3600)
        val s = Session(j.getString("access_token"), j.getString("refresh_token"), exp, u.getString("id"), u.optString("email"))
        session = s
        prefs.edit().putString("session", JSONObject().put("access", s.access).put("refresh", s.refresh).put("exp", s.expiresAt).put("uid", s.userId).put("email", s.email).toString()).apply()
    }

    fun clearSession() {
        session = null
        prefs.edit().remove("session").apply()
    }

    private fun http(method: String, path: String, body: String?, token: String?, headers: Map<String, String> = emptyMap()): String {
        val c = try { URL(SB_URL + path).openConnection() as HttpURLConnection } catch (e: IOException) { throw SbError(0, null, "network", true) }
        try {
            c.requestMethod = method
            c.connectTimeout = 15000
            c.readTimeout = 20000
            c.useCaches = false
            c.setRequestProperty("apikey", SB_KEY)
            c.setRequestProperty("Content-Type", "application/json")
            if (token != null) c.setRequestProperty("Authorization", "Bearer $token")
            headers.forEach { (k, v) -> c.setRequestProperty(k, v) }
            if (body != null) {
                c.doOutput = true
                c.outputStream.use { it.write(body.toByteArray(Charsets.UTF_8)) }
            }
            val code = c.responseCode
            val txt = (if (code in 200..299) c.inputStream else c.errorStream)?.bufferedReader(Charsets.UTF_8)?.use { it.readText() } ?: ""
            if (code !in 200..299) {
                val j = try { JSONObject(txt) } catch (e: Exception) { null }
                val msg = j?.let { it.optString("msg").ifEmpty { it.optString("message") }.ifEmpty { it.optString("error_description") }.ifEmpty { it.optString("error") } }?.ifEmpty { null } ?: "HTTP $code"
                throw SbError(code, j?.optString("error_code")?.ifEmpty { null } ?: j?.optString("code")?.ifEmpty { null }, msg)
            }
            return txt
        } catch (e: IOException) {
            throw SbError(0, null, "network", true)
        } finally {
            c.disconnect()
        }
    }

    fun signIn(email: String, password: String) {
        val j = JSONObject(http("POST", "/auth/v1/token?grant_type=password", JSONObject().put("email", email).put("password", password).toString(), null))
        setSession(j)
        lastEmail = email
    }

    fun signOut() {
        val s = session ?: return
        try { http("POST", "/auth/v1/logout", null, s.access) } catch (e: Exception) {}
        clearSession()
    }

    private fun ensureFresh(force: Boolean = false) {
        val s = session ?: throw SbError(401, null, "signed out")
        if (force || s.expiresAt * 1000 - System.currentTimeMillis() < 60_000) {
            setSession(JSONObject(http("POST", "/auth/v1/token?grant_type=refresh_token", JSONObject().put("refresh_token", s.refresh).toString(), null)))
        }
    }

    /** An authenticated REST call; refreshes the token once on 401. */
    fun rest(method: String, path: String, body: String? = null, headers: Map<String, String> = emptyMap()): String {
        ensureFresh()
        return try {
            http(method, path, body, session!!.access, headers)
        } catch (e: SbError) {
            if (e.status != 401) throw e
            ensureFresh(true)
            http(method, path, body, session!!.access, headers)
        }
    }
}

/** Turkish messages for sign-in errors, matching authErrorMsg in the web app. */
fun authErrorMsg(e: Exception): String {
    if (e !is SbError) return "Giriş yapılamadı: ${e.message}"
    val c = e.code ?: ""
    val m = (e.message ?: "").lowercase()
    return when {
        e.network -> "Bağlantı kurulamadı. İnternetini kontrol et."
        c == "invalid_credentials" || "invalid login credentials" in m -> "E-posta ya da şifre yanlış."
        c == "email_not_confirmed" || "not confirmed" in m -> "E-posta adresin henüz onaylanmamış."
        e.status == 429 || "rate limit" in m -> "Çok fazla deneme yapıldı. Birkaç dakika sonra tekrar dene."
        else -> "Giriş yapılamadı: ${e.message}"
    }
}
