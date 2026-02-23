// Centralized admin access list — add emails here to grant admin panel access
export const ADMIN_EMAILS = ["daks977463@gmail.com", "vserv777@gmail.com"];

export const isAdmin = (email) => ADMIN_EMAILS.includes(email);
