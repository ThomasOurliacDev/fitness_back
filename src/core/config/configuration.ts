export default () => ({
	port: parseInt(process.env.PORT!, 10) || 3000,
	database: {
		url: process.env.DATABASE_URL
	},
	jwt: {
		secret: process.env.JWT_SECRET,
		signOptions: { expiresIn: process.env.JWT_EXPERATION },
		refreshExpiresIn: process.env.JWT_REFRESH_EXPIRATION
	},
	FRONTEND_URL: process.env.FRONTEND_URL
});
