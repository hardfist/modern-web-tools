//
//  MemoryModel.swift
//  cs193
//
//  Created by yj on 2021/8/26.
//

import Foundation
struct MemoryGame<CardContent> {
    var cards: Array<Card>;
    func choose(card:Card){
        print("\(card)")
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
