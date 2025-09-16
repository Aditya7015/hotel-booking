import User from '../models/User.js';
import { Webhook } from 'svix';

const clerkWebhooks = async (req, res) => {
    try {
        console.log("🔔 Clerk webhook received!");
        console.log("Headers:", req.headers);
        console.log("Raw body:", req.body);

        // ✅ Create a Svix instance with Clerk webhook secret
        const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET);

        // ✅ Getting Headers
        const headers = {
            "svix-id": req.headers["svix-id"],
            "svix-timestamp": req.headers["svix-timestamp"],
            "svix-signature": req.headers["svix-signature"],
        };

        // ✅ Verifying Headers
        await wh.verify(JSON.stringify(req.body), headers);

        // ✅ Getting Data from request body
        const { data, type } = req.body;

        

        // ✅ Switch Cases for different Events
        switch (type) {
            case "user.created": {
                const userData = {
                    _id: data.id,
                    email: data.email_addresses?.[0]?.email_address || "",
                    username: `${data.first_name || ""} ${data.last_name || ""}`.trim(),
                    image: data.image_url || "",
                };
                await User.create(userData);
                break;
            }
            case "user.updated": {
                const userData = {
                    _id: data.id,
                    email: data.email_addresses?.[0]?.email_address || "",
                    username: `${data.first_name || ""} ${data.last_name || ""}`.trim(),
                    image: data.image_url || "",
                };
                await User.findByIdAndUpdate(data.id, userData);
                break;
            }
            case "user.deleted": {
                await User.findByIdAndDelete(data.id);
                break;
            }
            default:
                break;
        }

        res.json({ success: true, message: "Webhook Received" });
    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message });
    }
};

export default clerkWebhooks;
