//
//  MemoryModel.swift
//  cs193
//
//  Created by yj on 2021/8/26.
//

import Foundation
import Alamofire
struct MemoryGame<CardContent> where CardContent: Equatable {
    var cards: Array<Card>;
    var indexOfTheOneAndOnlyFaceUpCard: Int? {
        get {
            var faceupCardIndices = [Int]()
            for index in cards.indices {
                if cards[index].isFaceUp {
                    faceupCardIndices.append(index);
                }
            }
            if faceupCardIndices.count == 1 {
                return faceupCardIndices.first;
            }else {
                return nil;
            }
            
        }
        set {
            for index in cards.indices {
                if index == newValue {
                    cards[index].isFaceUp = true;
                }else {
                    cards[index].isFaceUp = false;
                }
            }
        }
    }
    mutating func choose(card:Card){
        print("\(card)")
        AF.request("https://httpbin.org/get").response { response in
            debugPrint(response)
        }
        if let chooseIndex: Int = self.cards.firstIndex(matching: card) , !cards[chooseIndex].isFaceUp {
            
            if let potentialMatchIndex = indexOfTheOneAndOnlyFaceUpCard {
                if cards[chooseIndex].content == cards[potentialMatchIndex].content {
                    cards[chooseIndex].isMatched = true;
                    cards[potentialMatchIndex].isMatched = true;
                }
            }else {
                for index in cards.indices {
                    cards[index].isFaceUp = false;
                }
                indexOfTheOneAndOnlyFaceUpCard = chooseIndex;
            }
            self.cards[chooseIndex].isFaceUp = true;
        }
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
        var isFaceUp: Bool = false
        var isMatched: Bool = false
        var content: CardContent;
        var id:Int;
    }
}
