import os
import sys
import argparse
from reportlab.lib.pagesizes import A5
from reportlab.pdfgen import canvas
from reportlab.lib.units import cm

def generate_receipt(receipt_no, member_name, amount, date, payment_method, received_by, output_path):
    c = canvas.Canvas(output_path, pagesize=A5)
    width, height = A5

    # Border
    c.setStrokeColorRGB(0.1, 0.26, 0.2) # Dark Green
    c.setLineWidth(2)
    c.rect(0.5*cm, 0.5*cm, width-1*cm, height-1*cm)

    # Header
    c.setFillColorRGB(0.1, 0.26, 0.2)
    c.rect(0.5*cm, height-3*cm, width-1*cm, 2.5*cm, fill=1)
    
    c.setFillColorRGB(1, 1, 1)
    c.setFont("Helvetica-Bold", 16)
    c.drawCentredString(width/2, height-1.8*cm, "Doulkhand East Hilful Fuzul Foundation")
    c.setFont("Helvetica", 10)
    c.drawCentredString(width/2, height-2.4*cm, "Charity & Community Development")

    # Receipt Title
    c.setFillColorRGB(0, 0, 0)
    c.setFont("Helvetica-Bold", 14)
    c.drawCentredString(width/2, height-4.5*cm, "DONATION RECEIPT")

    # Content
    c.setFont("Helvetica", 12)
    y = height - 6*cm
    line_height = 0.8*cm

    details = [
        ("Receipt No:", receipt_no),
        ("Date:", date),
        ("Member Name:", member_name),
        ("Amount:", f"BDT {amount}/-"),
        ("Method:", payment_method),
        ("Received By:", received_by)
    ]

    for label, value in details:
        c.setFont("Helvetica-Bold", 11)
        c.drawString(2*cm, y, label)
        c.setFont("Helvetica", 11)
        c.drawString(6*cm, y, str(value))
        y -= line_height

    # Footer Note
    c.setFont("Helvetica-Oblique", 9)
    c.drawCentredString(width/2, 2*cm, "Thank you for your generous contribution!")
    
    # Signatures
    c.setLineWidth(0.5)
    c.line(2*cm, 3.5*cm, 6*cm, 3.5*cm)
    c.drawCentredString(4*cm, 3*cm, "Authorized Sign")
    
    c.line(width-6*cm, 3.5*cm, width-2*cm, 3.5*cm)
    c.drawCentredString(width-4*cm, 3*cm, "Member Sign")

    c.save()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Generate Donation Receipt PDF')
    parser.add_argument('--receipt', required=True)
    parser.add_argument('--name', required=True)
    parser.add_argument('--amount', required=True)
    parser.add_argument('--date', required=True)
    parser.add_argument('--method', required=True)
    parser.add_argument('--received', required=True)
    parser.add_argument('--output', required=True)
    
    args = parser.parse_argument_group().parser.parse_args()
    
    generate_receipt(
        receipt_no=args.receipt,
        member_name=args.name,
        amount=args.amount,
        date=args.date,
        payment_method=args.method,
        received_by=args.received,
        output_path=args.output
    )
