# Post-`cap add/sync` tweaks: notification permission, version from CI run number, stable signing key.
import os, re, sys, shutil
here = os.path.dirname(os.path.abspath(__file__)); app = os.path.dirname(here)
main = os.path.join(app, 'android', 'app', 'src', 'main', 'AndroidManifest.xml')
m = open(main).read()
for perm in ('android.permission.POST_NOTIFICATIONS', 'android.permission.RECEIVE_BOOT_COMPLETED'):
    if perm not in m:
        m = m.replace('</manifest>', '    <uses-permission android:name="%s" />\n</manifest>' % perm)
open(main, 'w').write(m)
run = os.environ.get('GITHUB_RUN_NUMBER', '1')
g = os.path.join(app, 'android', 'app', 'build.gradle'); s = open(g).read()
s = re.sub(r'versionCode \d+', 'versionCode %s' % run, s)
s = re.sub(r'versionName "[^"]*"', 'versionName "1.%s"' % run, s)
open(g, 'w').write(s)
# Same debug key on every CI run so a new APK installs over the old one (keeps local data).
home = os.path.expanduser('~/.android'); os.makedirs(home, exist_ok=True)
shutil.copyfile(os.path.join(app, 'momentum-debug.jks'), os.path.join(home, 'debug.keystore'))
print('patched manifest, version', run)
