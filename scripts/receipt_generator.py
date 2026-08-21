import os
import argparse
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
    try:
        # Note: In a real environment, provide path to specific .ttf files
        font_title = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 36)
        font_sub = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 20)
        font_bold = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 24)
        font_regular = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 22)
    except:
        font_title = ImageFont.load_default()
        font_sub = ImageFont.load_default()
        font_bold = ImageFont.load_default()
        font_regular = ImageFont.load_default()

    # Logo
    logo_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'public', 'assets', 'logo.jpg')
    if os.path.exists(logo_path):
        logo = Image.open(logo_path)
        logo = logo.resize((100, 100))
        img.paste(logo, (50, 40))

    # Title
    title_text = "Doulkhand East Hilful Fuzul Foundation"
    draw.text((170, 60), title_text, fill=(255, 255, 255), font=font_title)
    
    sub_text = "Charity & Community Development"
    w = draw.textlength(sub_text, font=font_sub)
    draw.text(((width-w)/2, 120), sub_text, fill=(255, 255, 255), font=font_sub)

    # Receipt Label
    label = "DONATION RECEIPT"
    w = draw.textlength(label, font=font_bold)
    draw.text(((width-w)/2, 230), label, fill=ink, font=font_bold)

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
    w = draw.textlength(footer, font=font_regular)
    draw.text(((width-w)/2, height-150), footer, fill=ink, font=font_regular)

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
