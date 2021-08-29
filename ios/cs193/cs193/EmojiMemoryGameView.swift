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
        GeometryReader{ geometry in
            self.body(for:geometry.size)
        }
    }
    func body(for size: CGSize) -> some View{
        ZStack{
            if(card.isMatched){
                RoundedRectangle(cornerRadius: cornerRadius).fill(Color.blue);
            }else {
            if(card.isFaceUp ){
                RoundedRectangle(cornerRadius:cornerRadius).fill(Color.white)
                RoundedRectangle(cornerRadius: cornerRadius).stroke(lineWidth:edgeLineWidth)
                Text(card.content)
            }else {
                RoundedRectangle(cornerRadius: cornerRadius).fill();
            }
            }
        }.font(Font.system(size: self.fontSize(for: size)))
    }
    let cornerRadius: CGFloat = 10.0;
    let edgeLineWidth: CGFloat = 3;
    let fontScaleFactor: CGFloat = 0.75;
    func fontSize(for size: CGSize) -> CGFloat{
        return min(size.width, size.height) * self.fontScaleFactor;
    }
}
struct EmojiMemoryGameView: View {
    @ObservedObject var viewModel: EmojiMemoryGame;
    var body: some View {
        Grid(viewModel.cards){card in
            CardView(card: card).onTapGesture {
                self.viewModel.choose(card: card)
            }
        }.foregroundColor(.orange).padding().font(.largeTitle).padding()
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
