/**
 * WhatsApp Notification Utility
 * Uses WhatsApp Cloud API (Meta)
 */

const WHATSAPP_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;

export async function sendWhatsAppMessage(to: string, message: string) {
  if (!WHATSAPP_TOKEN || !PHONE_NUMBER_ID) {
    console.warn("WhatsApp credentials not set. Skipping message.");
    return null;
  }

  // Format number: ensure it has country code and no '+'
  const formattedPhone = to.replace(/\D/g, "");
  
  try {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${WHATSAPP_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: formattedPhone,
          type: "text",
          text: { body: message },
        }),
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
export async function sendDonationAlert(member: any, amount: number, date: string) {
  const text = `আসসালামু আলাইকুম ${member.name},
আপনার ৳${amount} দানটি সফলভাবে জমা হয়েছে।
তারিখ: ${date}
ফাউন্ডেশনের সাথে থাকার জন্য ধন্যবাদ!`;
  
  if (member.phone) {
    return await sendWhatsAppMessage(member.phone, text);
  }
}
