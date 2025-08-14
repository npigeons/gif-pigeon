import os

for fn in sorted(os.listdir('downloads')):
    print(fn)
    if not fn.endswith('.gif'):
        os.system(f'cp downloads/{fn} mp4/{fn}')
    else:
        nfn = fn[:-3] + 'mp4'
        os.system(f'ffmpeg -i downloads/{fn} mp4/{nfn} -loglevel error')
