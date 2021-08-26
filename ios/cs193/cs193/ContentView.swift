//
//  ContentView.swift
//  cs193
//
//  Created by yj on 2021/8/26.
//

import SwiftUI

struct CardView: View {
    var isFaceUp: Bool = false;
    var body: some View {
        if(isFaceUp){
            ZStack{
                RoundedRectangle(cornerRadius: 10.0).fill(Color.white)
                RoundedRectangle(cornerRadius: 10).stroke(lineWidth: 3)
                Text("X").font(.largeTitle)
            }
        }else {
            RoundedRectangle(cornerRadius: 10.0).fill();
        }
    }
}
struct ContentView: View {
    var body: some View {
        HStack{
            ForEach(0..<4){ index in
                CardView(isFaceUp: false)
            }
        }.foregroundColor(.orange).padding().font(.largeTitle)
    }
}

struct ContentView_Previews: PreviewProvider {
    static var previews: some View {
        ContentView()
    }
}

