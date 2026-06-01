const fs = require('fs');
const content = fs.readFileSync('c:/Users/user/Documents/WaterMarginGame/assets/cards_data.js', 'utf8');
const match = content.match(/const cardsData = (\[[\s\S]*?\]);/);
const cardsData = eval(match[1]);

const counts = { '步軍': 0, '水軍': 0, '騎軍': 0, '統御': 0, '斥侯': 0 };

const hc = cardsData.find(c => c.type === '天罡卡');
console.log('Heaven card name:', hc.name, 'symbols:', hc.symbols);

let syms = hc.symbols || [];
syms.forEach(sym => {
    if (counts[sym] !== undefined) counts[sym]++;
});
console.log('Counts:', counts);
