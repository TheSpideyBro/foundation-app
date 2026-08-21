import os
import argparse
import sys
from PIL import Image, ImageDraw, ImageFont

def generate_receipt_image(receipt_no, member_name, amount, date, payment_method, received_by, output_path):
    # Canvas size (approx A5 ratio at 150 DPI)
    width, height = 800, 1131
    bg_color = (250, 246, 236) # Light Paper Color
    img = Image.new('RGB', (width, height), color=bg_color)
    draw = ImageDraw.Draw(img)

    # Colors
    dark_green = (15, 61, 51)
    brass = (201, 162, 39)
    ink = (28, 27, 23)
    
    # Border
    draw.rectangle([20, 20, width-20, height-20], outline=dark_green, width=4)

    # Header
    draw.rectangle([20, 20, width-20, 180], fill=dark_green)
    
    # Try to load fonts, fallback to default
    font_paths = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
        "/usr/share/fonts/truetype/freefont/FreeSansBold.ttf"
    ]
    
    font_title = None
    for path in font_paths:
        if os.path.exists(path):
            try:
                font_title = ImageFont.truetype(path, 36)
                font_bold = ImageFont.truetype(path, 24)
                regular_path = path.replace("Bold", "")
                if os.path.exists(regular_path):
                    font_regular = ImageFont.truetype(regular_path, 22)
                    font_sub = ImageFont.truetype(regular_path, 20)
                else:
                    font_regular = ImageFont.truetype(path, 22)
                    font_sub = ImageFont.truetype(path, 20)
                break
            except:
                continue
    
    if not font_title:
        font_title = ImageFont.load_default()
        font_sub = ImageFont.load_default()
        font_bold = ImageFont.load_default()
        font_regular = ImageFont.load_default()

    # Logo Integration
    try:
        logo_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'public', 'assets', 'logo.jpg')
        if os.path.exists(logo_path):
            logo = Image.open(logo_path)
            logo = logo.resize((110, 110), Image.Resampling.LANCZOS)
            mask = Image.new('L', (110, 110), 0)
            mask_draw = ImageDraw.Draw(mask)
            mask_draw.ellipse((0, 0, 110, 110), fill=255)
            
            output = Image.new('RGB', (110, 110), dark_green)
            output.paste(logo, (0, 0), mask)
            img.paste(output, (40, 35))
    except Exception as e:
        print(f"Logo error: {e}", file=sys.stderr)

    # Title & Branding
    title_text = "Doulkhand East Hilful Fuzul Foundation"
    draw.text((170, 55), title_text, fill=(255, 255, 255), font=font_title)
    
    sub_text = "Charity & Community Development"
    try:
        w = draw.textlength(sub_text, font=font_sub)
        draw.text(((width-w)/2, 120), sub_text, fill=(255, 255, 255), font=font_sub)
    except:
        draw.text((170, 120), sub_text, fill=(255, 255, 255), font=font_sub)

    # Receipt Label
    label = "DONATION RECEIPT"
    try:
        w = draw.textlength(label, font=font_bold)
        draw.text(((width-w)/2, 230), label, fill=ink, font=font_bold)
    except:
        draw.text((300, 230), label, fill=ink, font=font_bold)

    # Content
    y = 350
    line_height = 60
    
    details = [
        ("Receipt No:", receipt_no),
        ("Date:", date),
        ("Member Name:", member_name),
        ("Amount:", f"BDT {amount}/-"),
        ("Method:", payment_method),
        ("Received By:", received_by)
    ]

    for label, value in details:
        draw.text((100, y), label, fill=dark_green, font=font_bold)
        draw.text((350, y), str(value), fill=ink, font=font_regular)
        draw.line([100, y+40, width-100, y+40], fill=(220, 211, 188), width=1)
        y += line_height

    # Footer
    footer = "Thank you for your generous contribution!"
    try:
        w = draw.textlength(footer, font=font_regular)
        draw.text(((width-w)/2, height-150), footer, fill=ink, font=font_regular)
    except:
        draw.text((200, height-150), footer, fill=ink, font=font_regular)

    # Signatures
    draw.line([100, height-250, 300, height-250], fill=ink, width=2)
    draw.text((120, height-240), "Authorized Sign", fill=ink, font=font_regular)
    
    draw.line([width-300, height-250, width-100, height-250], fill=ink, width=2)
    draw.text((width-280, height-240), "Member Sign", fill=ink, font=font_regular)

    img.save(output_path, "JPEG", quality=95)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Generate Donation Receipt JPEG')
    parser.add_argument('--receipt', required=True)
    parser.add_argument('--name', required=True)
    parser.add_argument('--amount', required=True)
    parser.add_argument('--date', required=True)
    parser.add_argument('--method', required=True)
    parser.add_argument('--received', required=True)
    parser.add_argument('--output', required=True)
    
    args = parser.parse_args()
    
    generate_receipt_image(
        receipt_no=args.receipt,
        member_name=args.name,
        amount=args.amount,
        date=args.date,
        payment_method=args.method,
        received_by=args.received,
        output_path=args.output
    )
