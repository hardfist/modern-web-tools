//
//  EmojiMemoryGame.swift
//  cs193
//
//  Created by yj on 2021/8/26.
//

import Foundation

class EmojiMemoryGame : ObservableObject {
    static func createMemoryGame() -> MemoryGame<String>{
        let emojis = ["😁","😭","👻"];
        return MemoryGame<String>(numberOfPairsOfCards: emojis.count){idx in
            return emojis[idx];
        };
    }
    @Published private var model: MemoryGame<String> = createMemoryGame();
    var cards: Array<MemoryGame<String>.Card>{
        model.cards;
    }
    func choose(card: MemoryGame<String>.Card){
        objectWillChange.send()
        model.choose(card: card);
    }
    
}
