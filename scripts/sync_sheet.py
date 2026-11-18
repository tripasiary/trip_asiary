#!/usr/bin/env python3
"""Download public Google Sheet CSV, validate and write only public records."""
import csv, io, json, os, pathlib, sys, urllib.request
from datetime import datetime, timezone

ROOT = pathlib.Path(__file__).resolve().parents[1]
COLUMNS = ['id','city','area','category','name','local_name','address','map_url','blog_url','description','source','status']
ALLOWED_SOURCES = {'visited','researched','heard','unverified'}

def safe_url(value):
    value = value.strip()
    if not value: return ''
    if not value.startswith(('https://','http://')): raise ValueError('URL은 http(s)만 허용합니다: '+value[:70])
    return value

def main():
    url = os.environ.get('SHEET_CSV_URL','').strip()
    if not url: print('SHEET_CSV_URL 미설정: 기존 샘플 유지'); return
    if not url.startswith('https://docs.google.com/spreadsheets/'):
        raise ValueError('Google Sheets 공개 CSV URL만 허용합니다')
    req = urllib.request.Request(url, headers={'User-Agent':'AsiarySheetSync/1.0'})
    with urllib.request.urlopen(req, timeout=25) as res:
        raw = res.read(5_000_001)
    if len(raw)>5_000_000: raise ValueError('CSV 크기 제한 초과')
    reader = csv.DictReader(io.StringIO(raw.decode('utf-8-sig')))
    if not reader.fieldnames or any(c not in reader.fieldnames for c in COLUMNS):
        raise ValueError('필수 열 누락. README의 헤더를 확인하세요')
    places=[]; ids=set()
    for i, row in enumerate(reader, start=2):
        if (row.get('status') or '').strip().lower() not in {'public','공개'}: continue
        p={k:(row.get(k) or '').strip() for k in COLUMNS if k!='status'}
        if not p['id'] or not p['name'] or not p['city']: raise ValueError(f'{i}행 필수 정보 누락')
        if p['id'] in ids: raise ValueError(f'{i}행 중복 ID: {p["id"]}')
        ids.add(p['id'])
        if p['source'] and p['source'] not in ALLOWED_SOURCES: raise ValueError(f'{i}행 source 값 오류')
        p['map_url']=safe_url(p['map_url']);p['blog_url']=safe_url(p['blog_url'])
        places.append(p)
    if not places: raise ValueError('공개 장소가 0개입니다. 기존 데이터를 보호하기 위해 갱신을 중단합니다')
    target=ROOT/'data'/'places.json'
    # No change in content => avoid unnecessary commits.
    if target.exists():
        try:
            old=json.loads(target.read_text(encoding='utf-8'))
            if old.get('places')==places:
                print('변경 없음');return
        except (ValueError, OSError): pass
    target.write_text(json.dumps({'updated_at':datetime.now(timezone.utc).isoformat(timespec='seconds'),'places':places},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(f'{len(places)}개 공개 장소 동기화 완료')

if __name__=='__main__':
    try:main()
    except Exception as exc:
        print('동기화 실패:',exc,file=sys.stderr);sys.exit(1)
