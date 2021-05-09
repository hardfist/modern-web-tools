import vlq from 'vlq';

const res = vlq.encode([123, 456]);

console.log('res:', res);
console.log(vlq.decode(res));
