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
                RoundedRectangle(cornerRadius: 10).stroke(lineWidth: 3)
                Text(card.content).font(.largeTitle)
            }
        }else {
            RoundedRectangle(cornerRadius: 10.0).fill();
        }
    }
}
struct EmojiMemoryGameView: View {
    var viewModel: EmojiMemoryGame;
    var body: some View {
        HStack{
            ForEach(viewModel.cards){ card in
                CardView(card: card)
            }
        }.foregroundColor(.orange).padding().font(.largeTitle)
    }
}

struct ContentView_Previews: PreviewProvider {
    static var previews: some View {
        EmojiMemoryGameView(viewModel: EmojiMemoryGame())
    }
}

