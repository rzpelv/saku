import AppKit

let root = "ios/App/App/Assets.xcassets"
func render(size: Int, markSize: CGFloat, path: String, splash: Bool = false) throws {
    let image = NSImage(size: NSSize(width: size, height: size))
    image.lockFocus()
    let green = NSColor(srgbRed: 36/255, green: 79/255, blue: 70/255, alpha: 1)
    let pale = NSColor(srgbRed: 247/255, green: 248/255, blue: 250/255, alpha: 1)
    (splash ? pale : green).setFill()
    NSRect(x: 0, y: 0, width: size, height: size).fill()
    let context = NSGraphicsContext.current!.cgContext
    context.translateBy(x: (CGFloat(size) - markSize) / 2, y: (CGFloat(size) - markSize) / 2)
    context.scaleBy(x: markSize / 192, y: markSize / 192)
    context.setStrokeColor((splash ? green : NSColor(srgbRed: 245/255, green: 250/255, blue: 245/255, alpha: 1)).cgColor)
    context.setLineWidth(9)
    context.setLineJoin(.round)
    context.move(to: CGPoint(x: 49, y: 126))
    context.addCurve(to: CGPoint(x: 63, y: 140), control1: CGPoint(x: 49, y: 134), control2: CGPoint(x: 55, y: 140))
    context.addLine(to: CGPoint(x: 127, y: 140))
    context.addLine(to: CGPoint(x: 127, y: 117))
    context.addLine(to: CGPoint(x: 63, y: 117))
    context.addCurve(to: CGPoint(x: 49, y: 126), control1: CGPoint(x: 55, y: 117), control2: CGPoint(x: 49, y: 118))
    context.addLine(to: CGPoint(x: 49, y: 65))
    context.addQuadCurve(to: CGPoint(x: 63, y: 51), control: CGPoint(x: 49, y: 51))
    context.addLine(to: CGPoint(x: 143, y: 51))
    context.addLine(to: CGPoint(x: 143, y: 117))
    context.addLine(to: CGPoint(x: 63, y: 117))
    context.strokePath()
    context.stroke(CGRect(x: 115, y: 70, width: 28, height: 26))
    image.unlockFocus()
    let bitmap = NSBitmapImageRep(data: image.tiffRepresentation!)!
    try bitmap.representation(using: .png, properties: [:])!.write(to: URL(fileURLWithPath: path))
}
try render(size: 1024, markSize: 1024, path: "\(root)/AppIcon.appiconset/AppIcon-512@2x.png")
for name in ["splash-2732x2732", "splash-2732x2732-1", "splash-2732x2732-2"] {
    try render(size: 2732, markSize: 700, path: "\(root)/Splash.imageset/\(name).png", splash: true)
}
