import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThirdwebProvider } from "thirdweb/react";
import { Toaster } from "sonner";
import { ToastProvider } from "@/components/ui/toast";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
	title: "Next Dollar Club",
	description: "Join the Next Dollar Club - Mint your exclusive NFT",
	icons: {
		icon: [
			{ url: '/icon.ico', sizes: '16x16', type: 'image/x-icon' },
			{ url: '/icon.ico', sizes: '32x32', type: 'image/x-icon' },
		],
		shortcut: '/icon.ico',
		apple: '/icon.ico',
	},
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en">
			<head>
				<link rel="icon" href="/icon.ico" sizes="16x16" type="image/x-icon" />
				<link rel="icon" href="/icon.ico" sizes="32x32" type="image/x-icon" />
				<link rel="shortcut icon" href="/icon.ico" type="image/x-icon" />
				<link rel="apple-touch-icon" href="/icon.ico" />
			</head>
			<body className={inter.className}>
				<ToastProvider>
					<Toaster position="bottom-center" />
					<ThirdwebProvider>{children}</ThirdwebProvider>
				</ToastProvider>
			</body>
		</html>
	);
}
