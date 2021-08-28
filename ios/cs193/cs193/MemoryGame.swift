//
//  MemoryModel.swift
//  cs193
//
//  Created by yj on 2021/8/26.
//

import Foundation
struct MemoryGame<CardContent> {
    var cards: Array<Card>;
    mutating func choose(card:Card){
        print("\(card)")
        let chooseIndex: Int = self.index(of: card);
        self.cards[chooseIndex].isFaceUp = !self.cards[chooseIndex].isFaceUp;
        let arr: Array<Int> = [5,1,2,3,4];
        print(arr.greatest);
    }
    func index(of card:Card) -> Int{
        for index in 0..<self.cards.count{
            if self.cards[index].id == card.id {
                return index;
            }
        }
        return 0;
    }
    init(numberOfPairsOfCards:Int,cardContentFactory:(Int) -> CardContent){
        cards = Array<Card>();
        for pairIndex in 0..<numberOfPairsOfCards {
            let content = cardContentFactory(pairIndex);
            cards.append(Card(content:content, id:2*pairIndex));
            cards.append(Card(content: content, id:2*pairIndex+1));
        }
    }
    struct Card: Identifiable {
        var isFaceUp: Bool = true
        var isMatched: Bool = false
        var content: CardContent;
        var id:Int;
    }
}
