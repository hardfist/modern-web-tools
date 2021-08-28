//
//  ContentView.swift
//  cs193
//
//  Created by yj on 2021/8/26.
//

import SwiftUI

struct CardView: View {
    var card: MemoryGame<String>.Card;
    var body: some View {
        if(card.isFaceUp){
            ZStack{
                RoundedRectangle(cornerRadius: 10.0).fill(Color.white)
                RoundedRectangle(cornerRadius: 10).stroke(lineWidth:3)
                Text(card.content).font(.largeTitle)
            }
        }else {
            RoundedRectangle(cornerRadius: 10.0).fill();
        }
    }
}
struct EmojiMemoryGameView: View {
    @ObservedObject var viewModel: EmojiMemoryGame;
    var body: some View {
        HStack{
            ForEach(viewModel.cards){ card in
                CardView(card: card).onTapGesture {
                    self.viewModel.choose(card: card)
                }
            }
        }.foregroundColor(.orange).padding().font(.largeTitle)
    }
}

struct ContentView_Previews: PreviewProvider {
    static var previews: some View {
        EmojiMemoryGameView(viewModel: EmojiMemoryGame())
    }
}


protocol Greatness {
    func isGreaterThan(other:Self) -> Bool;
}

extension Array where Element : Greatness {
    var greatest: Element {
        var greatest = self[0];
        for x in 1..<self.count{
            if(self[x].isGreaterThan(other: greatest)){
                greatest = self[x];
            }
        }
        return greatest;
    }
}

extension Int: Greatness {
    func isGreaterThan(other: Int) -> Bool {
        return self > other;
    }
}
