import AppKit
let target=CommandLine.arguments[1]
let size=NSSize(width:1024,height:1024)
let image=NSImage(size:size)
image.lockFocus()
NSColor(calibratedRed:0.13,green:0.36,blue:0.29,alpha:1).setFill()
NSBezierPath(roundedRect:NSRect(x:0,y:0,width:1024,height:1024),xRadius:225,yRadius:225).fill()
NSColor(calibratedRed:0.98,green:0.99,blue:0.94,alpha:1).setStroke()
let book=NSBezierPath();book.lineWidth=42;book.lineJoinStyle = .round;book.lineCapStyle = .round
book.move(to:NSPoint(x:225,y:720));book.curve(to:NSPoint(x:512,y:680),controlPoint1:NSPoint(x:335,y:760),controlPoint2:NSPoint(x:410,y:745));book.curve(to:NSPoint(x:799,y:720),controlPoint1:NSPoint(x:610,y:745),controlPoint2:NSPoint(x:700,y:760));book.line(to:NSPoint(x:799,y:315));book.curve(to:NSPoint(x:512,y:282),controlPoint1:NSPoint(x:690,y:346),controlPoint2:NSPoint(x:612,y:337));book.curve(to:NSPoint(x:225,y:315),controlPoint1:NSPoint(x:410,y:337),controlPoint2:NSPoint(x:330,y:346));book.close();book.stroke()
let spine=NSBezierPath();spine.lineWidth=38;spine.move(to:NSPoint(x:512,y:680));spine.line(to:NSPoint(x:512,y:282));spine.stroke()
image.unlockFocus()
let rep=NSBitmapImageRep(data:image.tiffRepresentation!)!
try rep.representation(using:.png,properties:[:])!.write(to:URL(fileURLWithPath:target))
