import json, sys, os
from collections import defaultdict

STORAGE_ID = '1083425209144578068'

with open(sys.argv[1], 'r') as f:
    backup = json.load(f)

channels = {}

for channel in backup['channels']:
    channels[channel['id']] = channel['name']

assert STORAGE_ID == next(cid for cid, c in channels.items() if c == 'gif-storage')
RAW_GIFS_ID = next(cid for cid, cname in channels.items() if cname == 'raw-gifs')
MISC = {'1082603812310765648': 'miscellaneous-emotions', '1082603766538313759': 'miscellaneous-situations'}

atts = {}
for att in backup['attachments']:
    assert att['attachment'] == att['url']
    atts[att['id']] = att['attachment']

def getchanneltag(cid):
    return MISC[cid] if cid in MISC else channels[cid]

# nongif = ['gif-dump', 'pigeon-logs', 'conversations', 'rules', 'avast-who-goes-there', 'mp4-to-gif-request']
nongif = {'1082507917158260769', '1086326675014439104', '1082553463633887243', '1082570522975551529', '1082580314863448124', '1092260717731774575'}
tenor = giphy = storage = nonstorage = 0
gifurls = defaultdict(set)
urltags = defaultdict(set)
discordurls = []
urlmsgs = defaultdict(list)
for msg in backup['messages']:
    if msg['channelId'] in nongif: continue
    content = msg['content']
    urls = content.split()
    # print(content)
    # print(msg['attachments'])
    # print(channels[msg['channelId']])
    for att in msg['attachments']:
        urls.append(atts[att])
    assert len(urls) == 1
    url = urls[0]
    if url.startswith('https://media.discordapp.net'):
        url = url.replace('media.discordapp.net', 'cdn.discordapp.com')
    urltags[url].add(getchanneltag(msg['channelId']))
    urlmsgs[url].append(msg)
    if 'tenor' in url.lower():
        tenor += 1
        gifurls['tenor'].add(url)
    elif 'giphy' in url.lower():
        giphy += 1
        gifurls['giphy'].add(url)
    else:
        assert 'discord' in url.lower()
        discordurls.append(url)
        att_cid = url.split('/')[4]
        if att_cid == STORAGE_ID:
            storage += 1
            gifurls['storage'].add(url)
        else:
            nonstorage += 1
            gifurls['nonstorage'].add(url)
print('tenor', tenor, len(gifurls['tenor']))
print('giphy', giphy, len(gifurls['giphy']))
print('storage', storage, len(gifurls['storage']))
print('nonstorage', nonstorage, len(gifurls['nonstorage']))

import re, requests, subprocess

# GIPHY_MP4s = '''https://giphy.com/gifs/kDkPqq55xf8G59bo3g https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExNzY0YWYwMGY1MWQ3MTIwNWQyZmE1NzM2MzAyMGNmMDEzZDU1YWE3NiZlcD12MV9pbnRlcm5hbF9naWZzX2dpZklkJmN0PWc/kDkPqq55xf8G59bo3g/giphy.mp4
# https://media.giphy.com/media/0sYHQGeBzeQA72ztte/giphy.gif https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExYTc4ODU0Mzg5YmI2OTIzNmRiNzE3YTdlNmNlMzFkOTQ0MjgzMjliYiZlcD12MV9pbnRlcm5hbF9naWZzX2dpZklkJmN0PWc/0sYHQGeBzeQA72ztte/giphy.mp4
# https://media.giphy.com/media/J1oJUP9OgrHMkIubV2/giphy.gif https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExMWU5MDY4NWNiZTFkNGY1NThiNDc3MmMyOWEzNWRjNTNiMjQzZjhkNSZlcD12MV9pbnRlcm5hbF9naWZzX2dpZklkJmN0PWc/J1oJUP9OgrHMkIubV2/giphy.mp4
# https://media.giphy.com/media/KdbzuCyMCbpx92Fk43/giphy-downsized-large.gif https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExMzZiYTYwYzg1MDE4YzQ0ZGY5MDNlZWUwYzQyNWU1ZDkwMzM0MjZjZSZlcD12MV9pbnRlcm5hbF9naWZzX2dpZklkJmN0PWc/KdbzuCyMCbpx92Fk43/giphy.mp4
# https://media.giphy.com/media/Ke2cQbxyeczf4ki2Re/giphy.gif https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExNGM0N2ZiODgwOWIzMDFmZGQ0ZmMxZDlkZmYzOWZkZWU4ZTE2NWNjMiZlcD12MV9pbnRlcm5hbF9naWZzX2dpZklkJmN0PWc/Ke2cQbxyeczf4ki2Re/giphy.mp4
# https://media.giphy.com/media/L39WIF8Nu1b54XsIUJ/giphy.gif https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExNTZlOWYxYjEzODMyNTRhN2VhNWY4Y2E0NmY5M2JmOTgwZmQ4YTVlZCZlcD12MV9pbnRlcm5hbF9naWZzX2dpZklkJmN0PWc/L39WIF8Nu1b54XsIUJ/giphy.mp4
# https://media.giphy.com/media/LKDcygoQm3zrTD65mT/giphy.gif https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExZGExZDgxNzM2MmM0ODRkN2UyYjAwYjJjMGVhMTEyNThjNDg5N2ViOSZlcD12MV9pbnRlcm5hbF9naWZzX2dpZklkJmN0PWc/LKDcygoQm3zrTD65mT/giphy.mp4
# https://media.giphy.com/media/LOWZoeaHdnXYx5KQR1/giphy.gif https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExNzYwMmRlZGFiMDJlMmU1NjBjM2RkMmQwYjFiN2QxY2MyMzBjMWM5NyZlcD12MV9pbnRlcm5hbF9naWZzX2dpZklkJmN0PWc/LOWZoeaHdnXYx5KQR1/giphy.mp4
# https://media.giphy.com/media/MFxzzuPXvKd6u9esyT/giphy.gif https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExOWJhNDk1NTU0MDhjNzQxNGY5YzQ0Y2Y5NWM4OTBjMjU2ODZiNDQ1ZiZlcD12MV9pbnRlcm5hbF9naWZzX2dpZklkJmN0PWc/MFxzzuPXvKd6u9esyT/giphy.mp4
# https://media.giphy.com/media/TcFUHPINs0O7mNaElO/giphy.gif https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExM2JhZDI0MDc2NzEyYTM3MTFjOGJhOTFjYzdiMTlmZWVmMzNjM2UwZiZlcD12MV9pbnRlcm5hbF9naWZzX2dpZklkJmN0PWc/TcFUHPINs0O7mNaElO/giphy.mp4
# https://media.giphy.com/media/W5C2bCD6QoQJCWEEhA/giphy.gif https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExMGU0MjQ5N2Y2ZjVkNjFjMmRiNjU2MzEzYTM0MWRmMzVhYTljZmMwNyZlcD12MV9pbnRlcm5hbF9naWZzX2dpZklkJmN0PWc/W5C2bCD6QoQJCWEEhA/giphy.mp4
# https://media.giphy.com/media/Wpwq67iFawqnWzF6dc/giphy.gif https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExNzdhYTM1NDk3YWRkOTI0ZDlkMzMwOWMyNWY5YTk4ZTU3OTg0OGMxYiZlcD12MV9pbnRlcm5hbF9naWZzX2dpZklkJmN0PWc/Wpwq67iFawqnWzF6dc/giphy.mp4
# https://media.giphy.com/media/Y0OaAJB4DjzXaODdcd/giphy.gif https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExMWE1ZjhlODJmNDlhNDg1NjhkZmMxN2YyNWExOGEwMDYzZmU2NDVmMSZlcD12MV9pbnRlcm5hbF9naWZzX2dpZklkJmN0PWc/Y0OaAJB4DjzXaODdcd/giphy.mp4
# https://media.giphy.com/media/ZahcGavYHMO3k9h2tb/giphy.gif https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExZDJiNzhlZGI0NTQ3ZDA4MjliOGY5NWRlMmQ0OGNjMjNjNTIwNWI0MSZlcD12MV9pbnRlcm5hbF9naWZzX2dpZklkJmN0PWc/ZahcGavYHMO3k9h2tb/giphy.mp4
# https://media.giphy.com/media/d5SpHaz3buyB9nGo17/giphy.gif https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExNmJkMDVlMGUyYzYwOTY0ZGQ1MTY4M2RiNDRiZjAyYmU3MTExMDcxMyZlcD12MV9pbnRlcm5hbF9naWZzX2dpZklkJmN0PWc/d5SpHaz3buyB9nGo17/giphy.mp4
# https://media.giphy.com/media/eNGDjMIliTvlDcH5tZ/giphy.gif https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExZTJiMTlmOGU0NGY5NTA2NzYyYTRiNWU1ZTIzNjEyNTZiN2M3ZTZkMCZlcD12MV9pbnRlcm5hbF9naWZzX2dpZklkJmN0PWc/eNGDjMIliTvlDcH5tZ/giphy.mp4
# https://media.giphy.com/media/f4OY90K03J5MifUpQP/giphy.gif https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExYzM0YTViY2JhNDNkMDVjNmFkZjUzNjM3MTEyNTQyNWRhMmFhMjhmMiZlcD12MV9pbnRlcm5hbF9naWZzX2dpZklkJmN0PWc/f4OY90K03J5MifUpQP/giphy.mp4
# https://media.giphy.com/media/fUGKS71ca5bScsXHxE/giphy.gif https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExZDVkYzJkN2Q1MTNmMDQzOGYwZjE4ZWM1ZDY4ZDBiMzJhNmJiY2ViMSZlcD12MV9pbnRlcm5hbF9naWZzX2dpZklkJmN0PWc/fUGKS71ca5bScsXHxE/giphy.mp4
# https://media.giphy.com/media/kCEKmZsnivBaxqMyBq/giphy.gif https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExNGZjYmFkOTI3YTM3YTEyNGMxMjVjMWE5ZDIxNGFhMzI5M2VjZDk5YyZlcD12MV9pbnRlcm5hbF9naWZzX2dpZklkJmN0PWc/kCEKmZsnivBaxqMyBq/giphy.mp4
# https://media.giphy.com/media/kcfoE51dSHh8lN6FdO/giphy.gif https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExY2MxNTExZmMxYzU1MTVlZWY0OGQ5NTU2ZmQxOTQxMzA4YmZhYWU5MCZlcD12MV9pbnRlcm5hbF9naWZzX2dpZklkJmN0PWc/kcfoE51dSHh8lN6FdO/giphy.mp4
# https://media.giphy.com/media/kfRvaQjK8wMu85M5pP/giphy.gif https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExNzUwZWUzYmU4ZWEyZGZjYjk2M2I5MWEwYzJkOWZjYjkwYjZiMGM5NyZlcD12MV9pbnRlcm5hbF9naWZzX2dpZklkJmN0PWc/kfRvaQjK8wMu85M5pP/giphy.mp4
# https://media.giphy.com/media/l0976QF1E3PGtignZ1/giphy.gif https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExNWQ1MTllMzViZGE3M2QzN2Q5Zjk0OGQ0M2UyZTI2YTM4MTk5ZTdhYiZlcD12MV9pbnRlcm5hbF9naWZzX2dpZklkJmN0PWc/l0976QF1E3PGtignZ1/giphy.mp4
# https://media.giphy.com/media/tLfTO0TjW68WgxEwvf/giphy.gif https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExYzY5NjcxNWQ1NDdlZDBmYTE4Y2Q2Nzk1ODVhYjNkMTIwNDdmZjUzZSZlcD12MV9pbnRlcm5hbF9naWZzX2dpZklkJmN0PWc/tLfTO0TjW68WgxEwvf/giphy.mp4'''

# mp4s = {x.split()[0]: x.split()[1] for x in GIPHY_MP4s.splitlines()}

# imgur = '''https://media.giphy.com/media/W5C2bCD6QoQJCWEEhA/giphy.gif https://imgur.com/UOusm8W
# https://media.giphy.com/media/J1oJUP9OgrHMkIubV2/giphy.gif https://imgur.com/VQo3cwI
# https://media.giphy.com/media/KdbzuCyMCbpx92Fk43/giphy-downsized-large.gif https://imgur.com/2xXl5h6
# https://media.giphy.com/media/Ke2cQbxyeczf4ki2Re/giphy.gif https://imgur.com/UuKrZaB
# https://media.giphy.com/media/L39WIF8Nu1b54XsIUJ/giphy.gif https://imgur.com/S6UvZ24
# https://giphy.com/gifs/kDkPqq55xf8G59bo3g https://imgur.com/0rMCk6L
# https://media.giphy.com/media/LOWZoeaHdnXYx5KQR1/giphy.gif https://imgur.com/l9wZbT4
# https://media.giphy.com/media/tLfTO0TjW68WgxEwvf/giphy.gif https://imgur.com/zydsvvQ
# https://media.giphy.com/media/ZahcGavYHMO3k9h2tb/giphy.gif https://imgur.com/E0QuTRD
# https://media.giphy.com/media/MFxzzuPXvKd6u9esyT/giphy.gif https://imgur.com/JzgZRfL
# https://media.giphy.com/media/LKDcygoQm3zrTD65mT/giphy.gif https://imgur.com/LQWaYuV
# https://media.giphy.com/media/eNGDjMIliTvlDcH5tZ/giphy.gif https://imgur.com/0IeCN1v
# https://media.giphy.com/media/kCEKmZsnivBaxqMyBq/giphy.gif https://imgur.com/BwJyKEI
# https://media.giphy.com/media/l0976QF1E3PGtignZ1/giphy.gif https://imgur.com/dKS7LUC
# https://media.giphy.com/media/d5SpHaz3buyB9nGo17/giphy.gif https://imgur.com/iz0XIkC
# https://media.giphy.com/media/kfRvaQjK8wMu85M5pP/giphy.gif https://imgur.com/e3YKjdh
# https://media.giphy.com/media/kcfoE51dSHh8lN6FdO/giphy.gif https://imgur.com/n2fIrGT
# https://media.giphy.com/media/fUGKS71ca5bScsXHxE/giphy.gif https://imgur.com/dVgmiA2
# https://media.giphy.com/media/Y0OaAJB4DjzXaODdcd/giphy.gif https://imgur.com/IkQ7miX
# https://media.giphy.com/media/f4OY90K03J5MifUpQP/giphy.gif https://imgur.com/LLC03Tb
# https://media.giphy.com/media/TcFUHPINs0O7mNaElO/giphy.gif https://imgur.com/pgAnjsN
# https://media.giphy.com/media/Wpwq67iFawqnWzF6dc/giphy.gif https://imgur.com/c8ZSOq6
# https://media.giphy.com/media/0sYHQGeBzeQA72ztte/giphy.gif https://imgur.com/qt5AnlW'''

# mp4_regex = r'https://media\d+.giphy.com/media/[^"]*\.mp4'
# for giphy in sorted(gifurls['giphy']):
#     if giphy.startswith('https://media.giphy.com/'):
#         url = 'https://giphy.com/gifs/' + giphy.split('/')[-2]
#     else:
#         url = giphy
#     print(giphy, re.findall(mp4_regex, requests.get(url).text)[0])

# rev = {y: x for x, y in mp4s.items()}
# for i, url in enumerate(sorted(mp4s.values())):
#     # os.system(f'wget "{url}" -O {i}.mp4 -q')
#     print(rev[url])


# DONE_STR = '''https://tenor.com/view/vldl-viva-la-dirt-league-epic-npc-man-vldl-rowan-vldl-baelin-gif-18639341 https://imgur.com/uVJumyj
# https://tenor.com/view/zonedout-hmsorrywhat-thevldlsquad-repeatthatplease-hm-gif-20498891 https://imgur.com/DjyqDz8
# https://tenor.com/view/thevldlsquad-vldl-ben-suspicious-yeahiknow-gif-20948713 https://imgur.com/az4bHS1
# https://tenor.com/view/growingoutrage-unbelievable-nod-thevldlsquad-fruitmerchant-gif-20998486 https://imgur.com/O2yh4Wt
# https://tenor.com/view/oh-i-see-epic-npc-dnd-vldl-gif-25722472 https://imgur.com/m2lVwQ8
# https://tenor.com/view/vldl-viva-la-dirt-league-vldl-rowan-vldl-helele-vldl-hash-brownie-gif-19219445 https://imgur.com/alS0ytX
# https://tenor.com/view/vldl-alan-thumbs_up-gif-22115058 https://imgur.com/HtmEAMG
# https://tenor.com/view/outrageous-vldl-viva-la-dirt-league-dark-souls-gif-20524337 https://imgur.com/4FUluQA
# https://tenor.com/view/shade-away-gif-20585139 https://imgur.com/DHI6MJo
# https://tenor.com/view/vldl-viva-la-dirt-league-epic-npc-man-vldl-yuck-vldl-rowan-gif-18639593 https://imgur.com/OZRuMN0
# https://tenor.com/view/vldl-dnd-viva-la-dirt-league-gif-22087105 https://imgur.com/tdGJPob
# https://tenor.com/view/vldl-viva-la-dirt-league-ben-benvanlier-gif-20754055 https://imgur.com/PMdkPH1
# https://tenor.com/view/vldl-viva-la-dirt-league-vldl-bored-vldl-rodney-gif-18664076 https://imgur.com/Qgu2xOt
# https://tenor.com/view/playtech-vldl-thevldlsquad-tsk-rowan-gif-20268868 https://imgur.com/ZhS1rsF
# https://tenor.com/view/zonedout-hmsorrywhat-thevldlsquad-repeatthatplease-hm-gif-20498891 https://imgur.com/I88gWCu
# https://tenor.com/view/growingoutrage-unbelievable-nod-thevldlsquad-fruitmerchant-gif-20998486 https://imgur.com/PvVDPIE
# https://tenor.com/view/vldl-viva-la-dirt-league-epic-npc-man-vldl-rowan-vldl-baelin-gif-18788659 https://imgur.com/fuZJRgf
# https://tenor.com/view/vldl-epic-npc-dnd-i-too-will-take-a-piddle-gif-25722541 https://imgur.com/Px3TcJ3
# https://tenor.com/view/vldl-viva-la-dirt-league-vldl-bodger-vldl-rowan-vldl-dnd-gif-19341664 https://imgur.com/7spNVqU
# https://tenor.com/view/vldl-vldl-ben-vldl-dn-d-dnd-umm-gif-23909161 https://imgur.com/m2u9yzL
# https://tenor.com/view/vldl-viva-la-dirt-league-vldl-bored-vldl-rowan-vldl-crying-gif-18764989 https://imgur.com/mIsL4AS
# https://tenor.com/view/no-bernard-thevldlsquad-ahno-vldl-gif-19970347 https://imgur.com/xLdZucL
# https://tenor.com/view/vldl-epic-npc-dnd-i-dont-like-this-gif-25722530 https://imgur.com/ZWvraRm
# https://tenor.com/view/vldl-viva-la-dirt-league-vldl-dnd-vldl-bodger-vldl-danger-gif-23553525 https://imgur.com/vxj2WKf
# https://tenor.com/view/discord-lurker-ive-been-here-the-whole-time-epic-npc-dnd-vldl-gif-25722485 https://imgur.com/1Q0r6uN
# https://tenor.com/view/vldl-viva-la-dirt-league-vldl-bored-vldl-rowan-gif-24259175 https://imgur.com/sC6O9H9
# https://tenor.com/view/accept-vldl-viva-la-dirt-league-viva-la-gif-19469606 https://imgur.com/XZsI0Zb
# https://tenor.com/view/vldl-viva-la-dirt-league-shame-shame-on-you-gif-18091740 https://imgur.com/CPkZqpu
# https://tenor.com/view/thevldlsquad-vldl-ben-suspicious-yeahiknow-gif-20948713 https://imgur.com/LvLPzLr
# https://tenor.com/view/vldl-dnd-welcome-gif-26388649 https://imgur.com/y3py3Dj
# https://tenor.com/view/vldl-viva-la-dirt-league-vldl-rowan-gif-19207791 https://imgur.com/oxbm2ch
# https://tenor.com/view/vldl-viva-la-dirt-league-epic-npc-man-vldl-rowan-vldl-baelin-gif-18788659 https://imgur.com/XuYAlcT
# https://tenor.com/view/vldl-viva-la-dirt-league-vldl-bored-vldl-rowan-gif-18736807 https://imgur.com/pzw6818
# https://tenor.com/view/zonedout-hmsorrywhat-thevldlsquad-repeatthatplease-hm-gif-20498891 https://imgur.com/CQPApQO
# https://tenor.com/view/vldl-epic-npc-dnd-i-dont-like-this-gif-25722530 https://imgur.com/NQZyP76
# https://tenor.com/view/vldl-viva-la-dirt-league-vldl-bored-vldl-rowan-vldl-crying-gif-18764989 https://imgur.com/D4Os0hv
# https://tenor.com/view/discord-lurker-ive-been-here-the-whole-time-epic-npc-dnd-vldl-gif-25722485 https://imgur.com/maWjwby
# https://tenor.com/view/vldl-dnd-viva-la-dirt-league-gif-22087105 https://imgur.com/5fP1nVf
# https://tenor.com/view/vldl-alan-thumbs_up-gif-22115058 https://imgur.com/F0F4tue
# https://tenor.com/view/vldl-viva-la-dirt-league-epic-npc-man-vldl-adam-vldl-eugene-gif-18664043 https://imgur.com/KlUmyxF
# https://tenor.com/view/vldl-viva-la-dirt-league-vldl-rowan-gif-19207791 https://imgur.com/ZF5ANyf
# https://tenor.com/view/playtech-vldl-youplayyourlittlegame-thevldlsquad-rowan-gif-20856518 https://imgur.com/rXMbg1I
# https://tenor.com/view/shadeaway-vldl-viva-la-dirt-league-sqaud-sqaudlife-gif-18108528 https://imgur.com/p66xM3o
# https://tenor.com/view/suspicious-dinkledork-npc-npcman-vldl-gif-19985741 https://imgur.com/rZ4V7Oz
# https://tenor.com/view/viva-la-dirt-league-vldl-rowan-alan-adam-what-really-gif-16078425 https://imgur.com/mB18Tll
# https://tenor.com/view/vldl-alan-blow-kiss-alan-kiss-vldl-love-gif-19087819 https://imgur.com/QVTzBNS
# https://tenor.com/view/vldl-ben-gif-23283449 https://imgur.com/s7kBYoi
# https://tenor.com/view/vldl-dnd-just-watch-me-gif-26208603 https://imgur.com/7o5RoAJ
# https://tenor.com/view/vldl-epic-npc-dnd-stop-being-selfish-gif-25722519 https://imgur.com/HclgDmN
# https://tenor.com/view/vldl-epic-npc-dnd-you-cant-fool-me-gif-25722525 https://imgur.com/hTXcyAn
# https://tenor.com/view/vldl-npc-dnd-frank-oh-no-not-this-again-gif-25814352 https://imgur.com/y2ImzWt
# https://tenor.com/view/vldl-pathetic-cry-adam-npc-man-epic-npc-man-gif-17292351 https://imgur.com/2QMoxfd
# https://tenor.com/view/vldl-rowan-bored-viva-la-dirt-league-funny-gif-24395592 https://imgur.com/829EO6e
# https://tenor.com/view/vldl-viva-la-dirt-league-epic-npc-man-greg-alan-morrison-gif-25120054 https://imgur.com/kGc1cwG
# https://tenor.com/view/vldl-viva-la-dirt-league-epic-npc-man-vldl-rowan-vldl-my-man-gif-24914320 https://imgur.com/yrir0Gj
# https://tenor.com/view/vldl-viva-la-dirt-league-muwah-gif-25120269 https://imgur.com/x0W8wfj
# https://tenor.com/view/vldl-viva-la-dirt-league-vldl-bored-vldl-ben-vldl-outrageous-gif-23509877 https://imgur.com/TMmwxpw
# https://tenor.com/view/vldl-viva-la-dirt-league-vldl-bored-vldl-ben-vldl-rob-gif-19176695 https://imgur.com/MArqPEZ
# https://tenor.com/view/vldl-viva-la-dirt-league-vldl-bored-vldl-mad-rowan-vldl-rowan-gif-18639517 https://imgur.com/hbFu5mP
# https://tenor.com/view/vldl-viva-la-dirt-league-vldl-bored-vldl-tissue-vldl-tissue-time-gif-25509820 https://imgur.com/zIAS6v2
# https://tenor.com/view/vldl-viva-la-dirt-league-vldl-ray-of-frost-ray-of-frost-vldl-greg-gif-18581629 https://imgur.com/nsF0BNR
# https://tenor.com/view/vldl-vldl-dn-d-bodger-cut-you-gif-23909368 https://imgur.com/og8UpgP
# https://tenor.com/view/vldl-vldl-dnd-well-done-gif-21605035 https://imgur.com/YZtE97L
# https://tenor.com/view/playtech-adam-flat-clicker-flatclicker-gif-19821423 https://imgur.com/7YEDec9
# https://tenor.com/view/viva-la-dirt-league-playtech-gif-19885416 https://imgur.com/YcPTaA6
# https://tenor.com/view/viva-la-dirt-league-playtech-gif-19907651 https://imgur.com/i23n6U8
# https://tenor.com/view/viva-la-dirt-league-popup-gate-keeper-keeper-gif-18009030 https://imgur.com/MXetda3
# https://tenor.com/view/vldl-alan-viva-la-dirt-league-wow-wildcard-gif-20754444 https://imgur.com/5Z6kKsu
# https://tenor.com/view/vldl-dnd-locket-gif-26353429 https://imgur.com/rfGeWaY
# https://tenor.com/view/vldl-epic-npc-dnd-whats-going-on-gif-25722518 https://imgur.com/FnUTjSj
# https://tenor.com/view/vldl-viva-la-dirt-league-ben-yes-gif-19764553 https://imgur.com/vKovZtH
# https://tenor.com/view/vldl-viva-la-dirt-league-glitch-gif-18199302 https://imgur.com/MYo9Dsb
# https://tenor.com/view/vldl-viva-la-dirt-league-vldl-bored-vldl-rowan-vldl-mad-gif-18848309 https://imgur.com/Ptf9wcM
# https://tenor.com/view/waves-vldl-vivaladirtleague-hi-gif-18055686 https://imgur.com/f1upKfO
# https://tenor.com/view/yourewelcome-detective-thevldlsquad-sowhatcanisayexceptyourewelcome-alan-gif-20526566 https://imgur.com/2sNREqm'''
# DONE = {x.split()[0]: x.split()[1] for x in DONE_STR.splitlines()}
# for line in imgur.splitlines():
#     x, y = line.split()
#     DONE[x] = y
# print(json.dumps(sorted(DONE.items())))

# MP4_URLS = '''https://tenor.com/view/playtech-vldl-youplayyourlittlegame-thevldlsquad-rowan-gif-20856518 https://media.tenor.com/8wGKjqisMw0AAAPo/playtech-vldl.mp4
# https://tenor.com/view/shadeaway-vldl-viva-la-dirt-league-sqaud-sqaudlife-gif-18108528 https://media.tenor.com/tdY_oVVBQ5wAAAPo/shadeaway-vldl.mp4
# https://tenor.com/view/suspicious-dinkledork-npc-npcman-vldl-gif-19985741 https://media.tenor.com/fb750RzeMkEAAAPo/suspicious-dinkledork.mp4
# https://tenor.com/view/viva-la-dirt-league-vldl-rowan-alan-adam-what-really-gif-16078425 https://media.tenor.com/PKr4DzXZzdIAAAPo/viva-la-dirt-league-vldl.mp4
# https://tenor.com/view/vldl-alan-blow-kiss-alan-kiss-vldl-love-gif-19087819 https://media.tenor.com/mbtwgWSTGd4AAAPo/vldl-alan-blow-kiss-alan-kiss.mp4
# https://tenor.com/view/vldl-ben-gif-23283449 https://media.tenor.com/j_NacNUR5eoAAAPo/vldl-ben.mp4
# https://tenor.com/view/vldl-dnd-just-watch-me-gif-26208603 https://media.tenor.com/tflPn39VpkwAAAPo/vldl-dnd.mp4
# https://tenor.com/view/vldl-epic-npc-dnd-stop-being-selfish-gif-25722519 https://media.tenor.com/fk1Z_RFwTn0AAAPo/vldl-epic-npc-dnd.mp4
# https://tenor.com/view/vldl-epic-npc-dnd-you-cant-fool-me-gif-25722525 https://media.tenor.com/77iSNFqfPC8AAAPo/vldl-epic-npc-dnd.mp4
# https://tenor.com/view/vldl-npc-dnd-frank-oh-no-not-this-again-gif-25814352 https://media.tenor.com/BBRs8sxUEs8AAAPo/vldl-npc-dnd.mp4
# https://tenor.com/view/vldl-pathetic-cry-adam-npc-man-epic-npc-man-gif-17292351 https://media.tenor.com/VJpWv_GYEFUAAAPo/vldl-pathetic-cry.mp4
# https://tenor.com/view/vldl-rowan-bored-viva-la-dirt-league-funny-gif-24395592 https://media.tenor.com/vl82_KROWhAAAAPo/vldl-rowan.mp4
# https://tenor.com/view/vldl-viva-la-dirt-league-epic-npc-man-greg-alan-morrison-gif-25120054 https://media.tenor.com/V1bO_xW2FXcAAAPo/vldl-viva-la-dirt-league.mp4
# https://tenor.com/view/vldl-viva-la-dirt-league-epic-npc-man-vldl-rowan-vldl-my-man-gif-24914320 https://media.tenor.com/DE9uEc_z7P0AAAPo/vldl-viva-la-dirt-league.mp4
# https://tenor.com/view/vldl-viva-la-dirt-league-muwah-gif-25120269 https://media.tenor.com/Ae2XHSmD7YwAAAPo/vldl-viva-la-dirt-league.mp4
# https://tenor.com/view/vldl-viva-la-dirt-league-vldl-bored-vldl-ben-vldl-outrageous-gif-23509877 https://media.tenor.com/_axnlI8myB0AAAPo/vldl-viva-la-dirt-league.mp4
# https://tenor.com/view/vldl-viva-la-dirt-league-vldl-bored-vldl-ben-vldl-rob-gif-19176695 https://media.tenor.com/dvia50B7QB8AAAPo/vldl-viva-la-dirt-league.mp4
# https://tenor.com/view/vldl-viva-la-dirt-league-vldl-bored-vldl-mad-rowan-vldl-rowan-gif-18639517 https://media.tenor.com/cMJcXB1urx0AAAPo/vldl-viva-la-dirt-league.mp4
# https://tenor.com/view/vldl-viva-la-dirt-league-vldl-bored-vldl-tissue-vldl-tissue-time-gif-25509820 https://media.tenor.com/kWnJRAvyDdUAAAPo/vldl-viva-la-dirt-league.mp4
# https://tenor.com/view/vldl-viva-la-dirt-league-vldl-ray-of-frost-ray-of-frost-vldl-greg-gif-18581629 https://media.tenor.com/lXkkQNgwNewAAAPo/vldl-viva-la-dirt-league.mp4
# https://tenor.com/view/vldl-vldl-dn-d-bodger-cut-you-gif-23909368 https://media.tenor.com/zF2laZo4ul4AAAPo/vldl-vldl-dn-d.mp4
# https://tenor.com/view/vldl-vldl-dnd-well-done-gif-21605035 https://media.tenor.com/xPvrt3vMxPkAAAPo/vldl-vldl-dnd.mp4
# https://tenor.com/view/playtech-adam-flat-clicker-flatclicker-gif-19821423 https://media.tenor.com/GTj9ooeEqWUAAAPo/playtech-adam.mp4
# https://tenor.com/view/viva-la-dirt-league-playtech-gif-19885416 https://media.tenor.com/tRxuyp4oUHQAAAPo/viva-la.mp4
# https://tenor.com/view/viva-la-dirt-league-playtech-gif-19907651 https://media.tenor.com/kfDBrw00Pz4AAAPo/viva-la.mp4
# https://tenor.com/view/viva-la-dirt-league-popup-gate-keeper-keeper-gif-18009030 https://media.tenor.com/f4bPYttSJUgAAAPo/viva-la-dirt-league-popup.mp4
# https://tenor.com/view/vldl-alan-viva-la-dirt-league-wow-wildcard-gif-20754444 https://media.tenor.com/LgH5-PMLSWQAAAPo/vldl-alan.mp4
# https://tenor.com/view/vldl-dnd-locket-gif-26353429 https://media.tenor.com/qPDbJXknaC8AAAPo/vldl-dnd.mp4
# https://tenor.com/view/vldl-epic-npc-dnd-whats-going-on-gif-25722518 https://media.tenor.com/n9Zr8tA0cIkAAAPo/vldl-epic-npc-dnd.mp4
# https://tenor.com/view/vldl-viva-la-dirt-league-ben-yes-gif-19764553 https://media.tenor.com/m_6Kvc7mG88AAAPo/vldl-viva-la-dirt-league.mp4
# https://tenor.com/view/vldl-viva-la-dirt-league-glitch-gif-18199302 https://media.tenor.com/pYqV_QEZ5uAAAAPo/vldl-viva-la-dirt-league.mp4
# https://tenor.com/view/vldl-viva-la-dirt-league-vldl-bored-vldl-rowan-vldl-mad-gif-18848309 https://media.tenor.com/fIb1q5oiLLUAAAPo/vldl-viva-la-dirt-league.mp4
# https://tenor.com/view/waves-vldl-vivaladirtleague-hi-gif-18055686 https://media.tenor.com/qPNU-buWQzUAAAPo/waves-vldl.mp4
# https://tenor.com/view/yourewelcome-detective-thevldlsquad-sowhatcanisayexceptyourewelcome-alan-gif-20526566 https://media.tenor.com/xjFd0BDftukAAAPo/yourewelcome-detective.mp4'''

# mp4s = {x.split()[0]: x.split()[1] for x in MP4_URLS.splitlines()}

# MP4_REGEX = r"""https://media.tenor.com/[^/]*/[^'"]*\.mp4""";
# imgurs = {}
# for x, y in DONE.items(): imgurs[x] = y
# for i, url in enumerate(sorted(gifurls['tenor'])):
#     if url in DONE: continue
#     if url in mp4s: continue
#     if url == 'https://c.tenor.com/BxNS-BLKDv4AAAAd/vldl-viva-la-dirt-league.gif': continue
#     if url == 'https://tenor.com/view/vlvl-alan-no-gif-18531970': continue
#     html = requests.get(url).text
#     mp4_url = re.findall(MP4_REGEX, html)[0]
#     print(url, mp4_url)
    # try:
    #     out = subprocess.check_output(['./imgur.sh', '3bda7d358c7d378ae1d5a10a0b4b5ae93cad998e', mp4_url, str(i)])
    #     data = json.loads(out)
    #     print(data)
    #     new_url = 'https://imgur.com/' + data['data']['id']
    #     print(url, new_url)
    #     imgurs[url] = new_url
    # except Exception:
    #     continue
# print(imgurs)

# i = 0
# for tenor, mp4 in mp4s.items():
#     # os.system(f'wget "{mp4}" -O {i}.mp4 -q')
#     print(tenor)
#     i += 1



import hashlib
# https://stackoverflow.com/questions/3431825/generating-an-md5-checksum-of-a-file
def md5(fname):
    hash_md5 = hashlib.md5()
    with open(fname, "rb") as f:
        for chunk in iter(lambda: f.read(4096), b""):
            hash_md5.update(chunk)
    return hash_md5.hexdigest()

def download(url, path):
    if os.path.exists(path): return
    print(path, url)
    if os.system(f'wget "{url}" -O "{path}" -q'):
        print('error?')
    if os.stat(path).st_size == 0:
        print('error?', url)
        os.system(f'rm {path}')


os.system('mkdir -p downloads')
exts = set()
errors = 0
attids = set()
hashes = defaultdict(list)
for url in sorted(set(discordurls)):
    attid = url.split('/')[5]
    assert attid not in attids
    attids.add(attid)
    ext = url[-3:]
    exts.add(ext)
    path = f'downloads/{attid}.{ext}'

    download(url, path)

    # md5
    if not os.path.exists(path):
        print(path, url)
        continue
    
    h = md5(path)
    hashes[h].append(url)

tenorurl = 'https://c.tenor.com/BxNS-BLKDv4AAAAd/vldl-viva-la-dirt-league.gif'
external = [[tenorurl, sorted(urltags[tenorurl])]]
multiupload = []
add_tags = []
duplicates = []
for h, urls in hashes.items():
    cids = [url.split('/')[4] for url in urls]
    if not STORAGE_ID in cids:
        if any(cid not in channels for cid in cids):
            if not all(cid not in channels for cid in cids):
                print('mixed?\n', urls)
                sys.exit()
            external.append([urls[0], [tag for url in urls for tag in urltags[url]]])
        else:
            if cids != [RAW_GIFS_ID]:
                if set(cids) == {RAW_GIFS_ID}:
                    duplicates.append([(msg['id'], msg['channelId']) for url in urls for msg in urlmsgs[url]])
                    print('raw-gifs duplicates:', urls)
                    continue
                tags = set()
                for url in urls: tags |= urltags[url]
                multiupload.append([urls[0], list(tags)])
                print([channels.get(cid, '?') for cid in cids])
                for url in sorted(set(urls)):
                    print(url)
        continue
    if cids == [STORAGE_ID]: continue
    if set(cids) == {STORAGE_ID}:
        duplicates.append([(msg['id'], msg['channelId']) for url in urls for msg in urlmsgs[url]])
        print('storage duplicates:', urls)
        continue
    tags = []
    for url, cid in zip(urls, cids):
        if cid == STORAGE_ID: main = url
        else: tags += list(urltags[url])
    add_tags.append((main, tags))
    print(set(urls))
    print([channels.get(cid, '?') for cid in cids])

for url in discordurls:
    tags = urltags[url]
    if url.split('/')[4] not in (STORAGE_ID, RAW_GIFS_ID):
        # print(url)
        continue
    misc = [tag for tag in tags if tag.startswith('misc')]
    if misc: add_tags.append((url, misc))

set_tags = sorted(external) + sorted(multiupload)
for giphy in sorted(gifurls['giphy']):
    set_tags.append((giphy, sorted(urltags[giphy])))
for tenor in sorted(gifurls['tenor']):
    set_tags.append((tenor, sorted(urltags[tenor])))

# reupload = [url for url, _ in external] + [url for url, _ in multiupload]
# print(f'const URLS = {json.dumps(reupload)}')
# print(f'const EXTERNAL = {json.dumps(sorted(external))};\n')
# print(f'const DUPLICATES = {json.dumps(duplicates)};\n')
# print(f'const MULTIUPLOAD = {json.dumps(multiupload)};\n')
# print(f'const SET_TAGS = {json.dumps(set_tags)}')

print(f'const ADD_TAGS = {json.dumps(add_tags)};\n')


# for url in sorted(external):
#     print(url)
        
        # print('no storage:', [channels.get(cid, '?') for cid in cids])
    
    # if len(urls) > 1:
    #     print(urls)
