/**
 * WhatsApp Notification Utility
 * Uses WhatsApp Cloud API (Meta)
 */

const WHATSAPP_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;

export async function sendWhatsAppMessage(to: string, message: string, mediaUrl?: string) {
  if (!WHATSAPP_TOKEN || !PHONE_NUMBER_ID) {
    console.warn("WhatsApp credentials not set. Skipping message.");
    return null;
  }

  const formattedPhone = to.replace(/\D/g, "");
  
  try {
    const body: any = {
      messaging_product: "whatsapp",
      to: formattedPhone,
    };

    if (mediaUrl) {
      body.type = "image";
      body.image = {
        link: mediaUrl,
        caption: message
      };
    } else {
      body.type = "text";
      body.text = { body: message };
    }

    const response = await fetch(
      `https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${WHATSAPP_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }
    );

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("WhatsApp Send Error:", error);
    return null;
  }
}

/**
 * Send a donation confirmation message
 */
export async function sendDonationAlert(member: any, amount: number, date: string, receiptUrl?: string) {
  const text = `আসসালামু আলাইকুম ${member.name},
আপনার ৳${amount} দানটি সফলভাবে জমা হয়েছে।
তারিখ: ${date}
ফাউন্ডেশনের সাথে থাকার জন্য ধন্যবাদ!`;
  
  if (member.phone) {
    return await sendWhatsAppMessage(member.phone, text, receiptUrl);
  }
}
