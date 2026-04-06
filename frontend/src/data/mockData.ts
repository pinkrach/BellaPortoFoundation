// PRIVACY: Never display full names, photos, or identifying details of residents.
// Use first names only + anonymized case codes (e.g., C0073).
// All resident data shown publicly must be aggregated and anonymized.

export const residents = [
  { id: "C0073", firstName: "Wendy", age: 14, education: "Grade 8", location: "Safehouse A", status: "Active" as const, riskLevel: "Low" as const },
  { id: "C0081", firstName: "Erica", age: 16, education: "Grade 10", location: "Safehouse B", status: "Active" as const, riskLevel: "Medium" as const },
  { id: "C0092", firstName: "Julia", age: 13, education: "Grade 7", location: "Safehouse A", status: "Transferred" as const, riskLevel: "Low" as const },
  { id: "C0095", firstName: "Maria", age: 15, education: "Grade 9", location: "Safehouse C", status: "Active" as const, riskLevel: "High" as const },
  { id: "C0101", firstName: "Ana", age: 12, education: "Grade 6", location: "Safehouse B", status: "Active" as const, riskLevel: "Low" as const },
  { id: "C0108", firstName: "Grace", age: 17, education: "Grade 11", location: "Safehouse A", status: "Closed" as const, riskLevel: "Low" as const },
];

export const impactStats = {
  girlsServed: 78,
  safehouses: 3,
  reintegrations: 24,
};

export const adminStats = {
  activeResidents: 100,
  monthlyDonations: 100,
  socialMediaEngagement: 2400,
  upcomingConferences: 5,
};

export const fundraisingGoal = {
  raised: 50,
  goal: 300,
};

export const donationsOverTime = [
  { month: "Jan", amount: 120 },
  { month: "Feb", amount: 180 },
  { month: "Mar", amount: 150 },
  { month: "Apr", amount: 220 },
  { month: "May", amount: 300 },
  { month: "Jun", amount: 250 },
];

export const donationTypes = [
  { name: "One-time", value: 45, color: "hsl(195, 66%, 32%)" },
  { name: "Monthly", value: 30, color: "hsl(11, 52%, 52%)" },
  { name: "Annual", value: 15, color: "hsl(282, 28%, 72%)" },
  { name: "In-kind", value: 10, color: "hsl(145, 21%, 58%)" },
];

export const safehouseImpact = [
  { month: "Jan", A: 12, B: 8, C: 5 },
  { month: "Feb", A: 14, B: 10, C: 7 },
  { month: "Mar", A: 11, B: 12, C: 6 },
  { month: "Apr", A: 16, B: 9, C: 8 },
  { month: "May", A: 18, B: 11, C: 9 },
  { month: "Jun", A: 15, B: 13, C: 10 },
];

export const residentStatusByHouse = [
  { name: "Active", value: 45, color: "hsl(195, 66%, 32%)" },
  { name: "In Rehab", value: 25, color: "hsl(11, 52%, 52%)" },
  { name: "Reintegrated", value: 20, color: "hsl(282, 28%, 72%)" },
  { name: "Transferred", value: 10, color: "hsl(180, 38%, 64%)" },
];

export const recentDonations = [
  { id: 1, donor: "Anonymous", amount: 50, date: "2024-03-15", type: "Monthly" },
  { id: 2, donor: "Community Fund", amount: 200, date: "2024-03-14", type: "One-time" },
  { id: 3, donor: "Anonymous", amount: 25, date: "2024-03-13", type: "Monthly" },
  { id: 4, donor: "Church Group", amount: 150, date: "2024-03-12", type: "One-time" },
  { id: 5, donor: "Anonymous", amount: 75, date: "2024-03-11", type: "Monthly" },
];

export const mlInsights = [
  { title: "High-risk resident requires immediate attention", description: "Case C0095 shows behavioral patterns indicating elevated risk. Schedule counseling session." },
  { title: "Safehouse B nearing capacity", description: "Current occupancy at 85%. Consider expanding or transferring residents." },
  { title: "Successful reintegration pattern detected", description: "Residents with 6+ months of education show 3x higher reintegration success." },
];

export const donationUsage = [
  { title: "Housing & Shelter", description: "40% of donations go directly to maintaining safe, clean, and nurturing safehouses for our girls. This includes rent, utilities, maintenance, and furnishing warm living spaces." },
  { title: "Education & Rehabilitation", description: "35% supports educational programs, therapy sessions, life skills training, and vocational workshops that prepare our girls for independent, successful futures." },
  { title: "Operations & Outreach", description: "25% covers organizational operations, community outreach, rescue coordination with authorities, and awareness campaigns to prevent trafficking." },
];

export const impactStories = [
  { quote: "Because of this foundation, I learned that I am worth more than what happened to me. I have dreams now.", age: 15 },
  { quote: "For the first time, I feel safe when I sleep at night. This is my home now.", age: 13 },
  { quote: "They taught me to read and write. Now I want to become a teacher and help other girls like me.", age: 16 },
];

export const testimonials = [
  { quote: "Seeing the transformation in these girls' lives is the most rewarding thing I've ever been a part of.", author: "Monthly Donor" },
  { quote: "Bella Porto gives these girls not just shelter, but a real chance at life. Every peso counts.", author: "Community Partner" },
  { quote: "The transparency and warmth of this organization makes me confident my donations are making a real difference.", author: "Annual Supporter" },
];
