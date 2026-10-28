import re,glob,json,sys
keys=[]
def add(k):
    if k not in keys: keys.append(k)
src=''.join(open(f).read() for f in sorted(glob.glob('[0-7]-*.js')))
pat=re.compile(r"""\b(?:T|cnt\([^,]+,)\s*\(?\s*(['"])((?:\\.|(?!\1).)*?)\1""")
for m in re.finditer(r"""(?<![\w.])T\(\s*(['"])((?:\\.|(?!\1).)*?)\1""",src): add(m.group(2).replace("\\'","'"))
for m in re.finditer(r"""cnt\([^,()]+(?:\([^)]*\))?[^,()]*,\s*(['"])((?:\\.|(?!\1).)*?)\1""",src): add(m.group(2).replace("\\'","'"))
# ternary literals inside T( a ? 'x' : 'y')
for m in re.finditer(r"""T\(([^()]*?\?[^()]*?)[,)]""",src):
    for q in re.findall(r"""'((?:\\.|[^'])*)'""",m.group(1)): add(q.replace("\\'","'"))
# arrays of labels
arrays=['BANDS','MOODS','JTAGS','POT_ICONS','BUGUN_CARDS','UEXP_CATS','TITLE','FIELDS','segs','opts']
for m in re.finditer(r"""\[\s*'([a-z0-9]+)'\s*,\s*(['"])((?:\\.|(?!\2).)*?)\2""",src): add(m.group(3).replace("\\'","'"))
for k in ['Uber','Kebapçı','Spor','İş','Bütçe verilerin taşındı','Momentum verilerin taşındı','Bütçe ve Momentum verilerin taşındı','Satın alındı','harika','çok iyi','iyi','idare eder','kötü','7 saatten fazla uyuduğun','daha az uyuduğun','Sigara içmediğin','sigara içtiğin','8.000 adımı geçtiğin','daha az yürüdüğün','Alışkanlıklarının çoğunu yaptığın','daha azını yaptığın','İçe aktarıldı: {a} yeni, {u} güncellendi, satılmış {r} varlık kaldırıldı.','İçe aktarıldı: {a} yeni, {u} güncellendi.','Para','Gelişim','Sağlık','Yatırım','Bugün']: add(k)
json.dump(keys,open('keys.json','w'),ensure_ascii=False,indent=0)
print(len(keys))
