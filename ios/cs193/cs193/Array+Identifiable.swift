//
//  Array+Identifiable.swift
//  cs193
//
//  Created by yj on 2021/8/28.
//

import Foundation


extension Array where Element: Identifiable {
    func firstIndex(matching : Element) -> Int? {
        for index in 0..<self.count {
            if(self[index].id == matching.id){
                return index;
            }
        }
        return nil;
    }
}
