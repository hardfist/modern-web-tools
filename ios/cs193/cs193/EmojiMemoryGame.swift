//
//  EmojiMemoryGame.swift
//  cs193
//
//  Created by yj on 2021/8/26.
//

import Foundation

class EmojiMemoryGame {
    static func createMemoryGame() -> MemoryGame<String>{
        let emojis = ["😁","😭"];
        return MemoryGame<String>(numberOfPairsOfCards: 2){idx in
            return emojis[idx];
        };
    }
    private var model: MemoryGame<String> = createMemoryGame();
    var cards: Array<MemoryGame<String>.Card>{
        model.cards;
    }
    func choose(card: MemoryGame<String>.Card){
        model.choose(card: card);
    }
    
}
