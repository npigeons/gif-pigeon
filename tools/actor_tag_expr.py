actors = ['alan', 'adam', 'ben', 'britt', 'byron', 'ellie', 'hamish', 'phoenix', 'rob', 'rowan']

for actor in actors:
    others = ' or '.join(a for a in actors if a != actor)
    print(f'{actor} and not ({others})')

anyone = ' or '.join(actors)
print(f'not ({anyone} or group)')

group = ' or '.join(f'({a} and {b})' for a in actors for b in actors if a < b)
print(f'group or {group}')
