import json, sys, os
from collections import defaultdict

STORAGE_ID = '1083425209144578068'

with open(sys.argv[1], 'r') as f:
    backup = json.load(f)

channels = {}

for channel in backup['channels']:
    channels[channel['id']] = channel['name']

assert STORAGE_ID == next(cid for cid, c in channels.items() if c == 'gif-storage')

atts = {}
for att in backup['attachments']:
    assert att['attachment'] == att['url']
    atts[att['id']] = att['attachment']


def download_direct(url, mid):
    ext = url.split('.')[-1]
    if '?' in ext: ext = ext[:ext.find('?')]
    path = f'downloads/{mid}.{ext}'
    if os.path.exists(path): return
    print(path, url)
    if os.system(f'wget "{url}" -O "{path}" -q --user-agent="Mozilla/5.0 (X11; Fedora; Linux x86_64; rv:52.0) Gecko/20100101 Firefox/52.0"'):
        print('error?')
    if os.stat(path).st_size == 0:
        print('error?', url)
        os.system(f'rm {path}')

def download_imgur(url, mid):
    url = url.replace('https://imgur.com/', 'https://i.imgur.com/')
    if not url.endswith('.mp4'): url += '.mp4'
    download_direct(url, mid)

gifurls = defaultdict(set)
discordurls = []
urlmsgs = defaultdict(list)
for msg in backup['messages']:
    if msg['channelId'] != STORAGE_ID: continue
    content = msg['content']
    urls = [w for w in content.split() if w.startswith('https://') and not w.startswith('https://discord.com/channels/')]
    for att in msg['attachments']: urls.append(atts[att])
    if len(urls) != 1:
        imgur = [url for url in urls if url.startswith('https://imgur.com')]
        # assert len(imgur) == 1
        urls = imgur
    # assert len(urls) == 1
    url = urls[0]
    if url.startswith('https://media.discordapp.net'):
        url = url.replace('media.discordapp.net', 'cdn.discordapp.com')
    urlmsgs[url].append(msg)
    if url.startswith('https://imgur.com'):
        gifurls['imgur'].add(url)
    else:
        assert 'discord' in url.lower()
        att_cid = url.split('/')[4]
        assert att_cid == STORAGE_ID
        gifurls['storage'].add(url)

print('attachments:', len(gifurls['storage']))
print('imgur links:', len(gifurls['imgur']))

mids = [urlmsgs[url][0]['id'] for url in gifurls['storage'] | gifurls['imgur']]
assert len(mids) == len(set(mids))

for url in gifurls['storage']:
    assert len(urlmsgs[url]) == 1
    mid = urlmsgs[url][0]['id']
    download_direct(url, mid)
    
for url in gifurls['imgur']:
    assert len(urlmsgs[url]) == 1
    mid = urlmsgs[url][0]['id']
    download_imgur(url, mid)
