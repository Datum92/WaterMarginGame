import json
import re

with open('c:/Users/user/Documents/WaterMarginGame/assets/cards_data.js', 'r', encoding='utf-8') as f:
    text = f.read()

m = re.search(r'const cardsData = (\[.*?\]);', text, re.DOTALL)
if m:
    data_str = m.group(1).replace('\'', '"')
    try:
        data = json.loads(data_str)
        counts = {'步軍':0, '水軍':0, '騎軍':0, '統御':0, '斥侯':0}
        for c in data:
            if c['type'] == '天罡卡':
                for s in c['symbols']:
                    if s in counts:
                        counts[s] += 1
                    else:
                        print(f"Unknown symbol: '{s}'")
        print(counts)
    except Exception as e:
        print("JSON parse error:", e)
