import ratelimit from "../config/upstash.js";

const rateLimiter = async (req, res, next) => {
  try {
    const { success } = await ratelimit.limit("my-rate-limit");

    if (!success) {
      return res.status(429).json({
        message: "Trop de requêtes, veuillez réessayer plus tard.",
      });
    }

    next();
  } catch (error) {
    console.log("Erreur de limitation de requêtes :", error);
    next(error);
  }
};

export default rateLimiter;
