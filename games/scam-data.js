// Scam or Legit? content. Every brand, bank, domain, handle and number here is FICTIONAL.
// Phone numbers are masked (98XXXXXX12 style). Domains are made-up examples.
// Shape: { id, channel: 'sms'|'whatsapp'|'email'|'upi'|'call', sender, time, body, scam, flag, lesson }
// Scam bodies mark exactly ONE red flag as [[...]]; legit bodies have none.
// Email bodies: first line is the subject. Call bodies: one line per speaker ("Caller: ...").
// Writing rule: flags cover whole sentences/clauses, and no "Rs." style abbreviations (sentences split on ". ").
window.BG_DATA_SCAM = {
  messages: [
    // =================== SCAMS (48) ===================
    // ---- KYC update ----
    {
      id: 's01', channel: 'sms', sender: '+91 98XXXXXX12', time: '9:14 AM', scam: true,
      body: 'Dear Customer, your Sapphire Bank account will be suspended today due to pending KYC. [[Update now at sapphirebank-kyc-update.in/verify]] to avoid blocking.',
      flag: 'Lookalike link, not sapphirebank.in',
      lesson: 'Check the real domain: sapphirebank.in is the bank, sapphirebank-kyc-update.in is not.',
    },
    {
      id: 's02', channel: 'sms', sender: '+91 70XXXXXX45', time: '11:02 AM', scam: true,
      body: 'Banyan Bank: Your PAN is not linked with your account. [[Your account will be blocked in 2 hours.]] Click bit.ly/byn-pan-upd to link now.',
      flag: 'Panic deadline: "blocked in 2 hours"',
      lesson: 'Fake urgency is the scammer\'s favourite tool. Banks give notice and never block you over an SMS link.',
    },
    {
      id: 's03', channel: 'email', sender: 'Sapphire Bank Security <alerts@sapphire-bank-secure.co>', time: '7:48 AM', scam: true,
      body: 'Action required: Re-KYC pending\n\nDear valued customer, as per new guidelines your KYC has expired. [[Reply to this email with your Aadhaar photo, card number and CVV]] to complete Re-KYC. Failure to comply will lead to permanent freezing of your account.',
      flag: 'Asks for CVV and ID by email',
      lesson: 'No bank ever asks for your CVV. Update KYC only inside the bank app or at a branch.',
    },
    {
      id: 's04', channel: 'whatsapp', sender: '+91 89XXXXXX03', time: '4:30 PM', scam: true,
      body: 'Hello sir, I am calling from Peacock Bank KYC department. Your debit card will stop working from tomorrow. [[Please download the attached file "PeacockKYC.apk" and fill your details.]] Thank you.',
      flag: 'Install an .apk file from a chat',
      lesson: 'An .apk sent on chat can read your SMS and OTPs. Install apps only from the official app store.',
    },
    // ---- Electricity bill disconnection ----
    {
      id: 's05', channel: 'sms', sender: '+91 91XXXXXX67', time: '8:52 PM', scam: true,
      body: 'Dear consumer, your electricity power will be disconnected tonight at 9:30 PM because your previous month bill was not updated. Our records show the last payment as failed. [[Please immediately contact our electricity officer at 91XXXXXX67.]] Thank you.',
      flag: 'Call a personal "officer" number',
      lesson: 'Power companies don\'t text from personal numbers asking you to call an "officer". Check your bill in the official app.',
    },
    {
      id: 's06', channel: 'whatsapp', sender: '+91 63XXXXXX29', time: '7:15 PM', scam: true,
      body: 'BrightGrid Power Notice: Your connection CA 30XXXX17 is marked for disconnection due to unpaid bill. [[Pay the pending ₹12 via this link to avoid cut: brightgrid-billpay.online]] Ignore and face disconnection tonight.',
      flag: 'Tiny payment via a lookalike link',
      lesson: 'A tiny "pending ₹12" is bait to grab your card or UPI details. BrightGrid\'s real site is brightgridpower.in.',
    },
    {
      id: 's07', channel: 'call', sender: '+91 74XXXXXX58 · Unknown', time: '6:05 PM', scam: true,
      body: 'Caller: Hello, I am from the electricity office, your meter is showing unpaid dues.\nYou: But I paid last week.\nCaller: Payment not updated in system, line will be cut in 1 hour.\n[[Caller: Install the "QuickSupport Desk" app and I will update it for you.]]',
      flag: 'Asks you to install a screen-sharing app',
      lesson: 'Screen-sharing apps give a stranger full control of your phone. No utility needs one to "update" a payment.',
    },
    // ---- UPI collect request reverse scam ----
    {
      id: 's08', channel: 'upi', sender: 'cashback.rewards@payzing', time: '2:41 PM', scam: true,
      body: 'Collect request ₹4,999 from QuickKart Rewards. Reward ID QKR-88213 for your festive order. [[Note: Enter UPI PIN to RECEIVE your cashback of ₹4,999]]',
      flag: 'Enter UPI PIN to "receive" money',
      lesson: 'You never need a UPI PIN to receive money. The PIN only ever sends money out.',
    },
    {
      id: 's09', channel: 'whatsapp', sender: '+91 82XXXXXX90', time: '10:20 AM', scam: true,
      body: 'Hi, I saw your sofa on the resale site. I\'m in the army, being transferred, will pay full ₹18,000 right now. [[I am sending you a request, just approve it with your PIN so the money comes to you.]]',
      flag: '"Approve with PIN" to get paid',
      lesson: 'A buyer who sends a request for you to approve is taking money, not paying. Receiving needs no PIN.',
    },
    {
      id: 's10', channel: 'upi', sender: 'refund.helpdesk@sapphire', time: '5:12 PM', scam: true,
      body: 'Collect request ₹9,850 from Refund Helpdesk. Case reference RF-20931 for your complaint. [[Note: Approve to get your failed transaction refund back]]',
      flag: 'Collect request labelled as a "refund"',
      lesson: 'Refunds come back on their own. A collect request always takes money from you, whatever the note says.',
    },
    {
      id: 's11', channel: 'call', sender: '+91 96XXXXXX31 · Unknown', time: '12:44 PM', scam: true,
      body: 'Caller: Ma\'am, I sent ₹5,000 to your number by mistake, please return it.\nYou: I didn\'t get any message.\nCaller: It will come, I have sent you a request for the same amount.\n[[Caller: Just open PayZing and accept the request with your PIN, it will cancel my mistake.]]',
      flag: '"Wrong transfer" plus a request to approve',
      lesson: 'Check your bank balance yourself first. If money truly arrived by mistake, ask the bank to reverse it.',
    },
    // ---- Fake customer care ----
    {
      id: 's12', channel: 'call', sender: '+91 88XXXXXX76 · Unknown', time: '3:18 PM', scam: true,
      body: 'Caller: Thank you for calling QuickKart customer care, I see your order refund is stuck.\nYou: Yes, I found this number on a search result.\n[[Caller: To process it I need the 6-digit code that just came on your phone.]]\nCaller: Refund will be credited in two minutes.',
      flag: 'Customer care asking for your OTP',
      lesson: 'Search ads can carry fake helplines. Get customer-care numbers only from the official app or website.',
    },
    {
      id: 's13', channel: 'whatsapp', sender: 'TiffinTap Support ✔ (+91 79XXXXXX40)', time: '9:05 PM', scam: true,
      body: 'Sorry your order was late! We are offering a ₹500 refund. [[To verify, share your full card number, expiry and the CVV on the back.]] Our team will credit it immediately.',
      flag: 'Asks for card number and CVV',
      lesson: 'A tick emoji in a name proves nothing. No real support team ever needs your CVV to refund you.',
    },
    {
      id: 's14', channel: 'email', sender: 'RideRover Help <support@riderover-helpdesk.net>', time: '10:33 AM', scam: true,
      body: 'Your complaint #RR-55821 has been registered\n\nWe noticed you were overcharged ₹340 on your last ride. [[To receive your refund, call our refund manager on +91 90XXXXXX17 and keep the line open while he guides you.]] Regards, RideRover Care.',
      flag: 'Refund via a personal phone number',
      lesson: 'Real refunds go back to your original payment method. Nobody needs to "guide you" on the phone for it.',
    },
    // ---- Part-time job / task scam ----
    {
      id: 's15', channel: 'whatsapp', sender: '+91 75XXXXXX22', time: '11:47 AM', scam: true,
      body: 'Hi! I am Neha from StarMedia HR. Part-time job: like videos on social media and earn ₹150 per like, ₹3,000 to ₹8,000 daily from home. [[Join our Telegram task group and complete a ₹1,000 prepaid task to unlock higher commission.]]',
      flag: 'Pay first to "unlock" earnings',
      lesson: 'Task scams pay small amounts first, then demand bigger "prepaid tasks". Real jobs never make you pay to earn.',
    },
    {
      id: 's16', channel: 'sms', sender: '+91 93XXXXXX88', time: '1:09 PM', scam: true,
      body: 'Congrats! You are selected for Work From Home data entry job with ShopNest. Salary ₹45,000 per month, no interview. [[Pay ₹2,500 refundable registration deposit to confirm your seat.]] Reply YES.',
      flag: 'Job that wants a deposit',
      lesson: 'A real employer never asks you to pay a deposit or fee to get a job.',
    },
    {
      id: 's17', channel: 'email', sender: 'Talent Team <hr.offers@quickkart-careers.work>', time: '6:30 PM', scam: true,
      body: 'Offer letter: Senior Associate, QuickKart\n\nWe are pleased to offer you the position with a CTC of ₹9.6 LPA. [[Kindly transfer ₹4,800 for laptop and ID card charges before your joining date.]] The amount will be adjusted in your first salary.',
      flag: 'Pay for your own "laptop and ID card"',
      lesson: 'Companies pay for your laptop, not the other way round. Asking for money before joining means a fake offer.',
    },
    {
      id: 's18', channel: 'whatsapp', sender: '+44 77XXXXXX10', time: '8:12 AM', scam: true,
      body: 'Good morning! We are hiring for hotel reviews. Simple tasks, 10 minutes a day. You already earned ₹210 as welcome bonus. [[To withdraw, first deposit ₹5,000 to upgrade to VIP level.]]',
      flag: 'Deposit money to withdraw "earnings"',
      lesson: 'If you must pay to withdraw your own earnings, those earnings don\'t exist.',
    },
    // ---- Digital arrest / fake police / customs parcel ----
    {
      id: 's19', channel: 'call', sender: '+91 85XXXXXX63 · Unknown', time: '11:20 AM', scam: true,
      body: 'Caller: This is SwiftPost. A parcel in your name to Taiwan has been seized with fake passports and drugs.\nCaller: I am connecting you to the Cyber Crime Branch now.\n[[Caller: You are under digital arrest, stay on video call and do not tell your family.]]\nCaller: To clear your name, move your savings to a safe RBI verification account.',
      flag: '"Digital arrest" on a video call',
      lesson: 'There is no such thing as "digital arrest". Real police never arrest you or ask for money over a video call. Hang up and call 1930.',
    },
    {
      id: 's20', channel: 'whatsapp', sender: '+91 70XXXXXX19', time: '2:55 PM', scam: true,
      body: 'NOTICE from Cyber Crime Department: Your mobile number is linked to a money laundering case. An arrest warrant is issued in your name. [[Join this video call within 30 minutes and keep it secret from everyone, or police will reach your home.]]',
      flag: 'Secret video "hearing" with a threat',
      lesson: 'Police send notices in person or by post, not via chat apps. "Keep it secret" is how scammers isolate you.',
    },
    {
      id: 's21', channel: 'sms', sender: '+91 97XXXXXX54', time: '10:01 AM', scam: true,
      body: 'SwiftPost: Your international parcel is held at customs. [[Pay customs duty ₹1,499 within 24 hrs at swiftpost-customs-clear.co.in]] or it will be returned and a legal case filed.',
      flag: 'Pay "customs duty" via a strange link',
      lesson: 'Not expecting a parcel from abroad? Then there\'s no duty to pay. Check only in the courier\'s official app.',
    },
    {
      id: 's22', channel: 'call', sender: '+91 99XXXXXX02 · Unknown', time: '4:40 PM', scam: true,
      body: 'Caller: Hello, I am Inspector Sharma from police. Your son has been caught in a case.\nCaller: He is crying, he is with us now.\n[[Caller: Send ₹50,000 on UPI right now to settle it or he will go to jail, don\'t call anyone.]]',
      flag: 'Urgent money to "free" a relative',
      lesson: 'Hang up and call your family member directly. Police never settle cases by UPI.',
    },
    // ---- Lottery / prize ----
    {
      id: 's23', channel: 'whatsapp', sender: '+92 30XXXXXX71', time: '9:33 PM', scam: true,
      body: 'Congratulations!! Your number has won ₹25 lakh in the Jackpot Jeeto Lucky Draw. Contact our manager to claim. [[Pay ₹12,500 GST and processing fee first to release your prize.]]',
      flag: 'Pay a fee to claim a prize',
      lesson: 'You can\'t win a draw you never entered, and real prizes never ask for a fee first.',
    },
    {
      id: 's24', channel: 'sms', sender: '+91 78XXXXXX36', time: '12:10 PM', scam: true,
      body: 'Nimbus Mobile: You have won a new smartphone in our 10th anniversary lucky draw! Only 50 customers were selected across India. [[Claim in 15 minutes: nimbus-gift-claim.in, just pay ₹99 delivery.]]',
      flag: 'Too-good prize, tiny "delivery fee" link',
      lesson: 'Free phones with a small "delivery fee" are bait for card details. A real prize never needs your card.',
    },
    {
      id: 's25', channel: 'email', sender: 'QuickKart Rewards <winners@quickkart-luckydraw.com>', time: '3:02 PM', scam: true,
      body: 'You\'re our Diwali Mega Winner!\n\nYour email was randomly selected to win a brand-new SUV worth ₹12 lakh. [[Click below and enter your bank login details to verify your identity.]] Offer valid 24 hours only.',
      flag: 'Enter bank login to "verify" a prize',
      lesson: 'Never type your bank login on a page you reached from an email. No prize needs it.',
    },
    // ---- Loan app harassment ----
    {
      id: 's26', channel: 'whatsapp', sender: '+91 62XXXXXX84', time: '7:40 AM', scam: true,
      body: 'Your InstaRupee loan of ₹3,000 is overdue. We have your contacts and gallery. [[Pay ₹14,000 today or we will send your morphed photos to all your contacts.]]',
      flag: 'Threat to shame you to your contacts',
      lesson: 'Real lenders can\'t blackmail you. Don\'t pay; save the evidence and report on 1930 or cybercrime.gov.in.',
    },
    {
      id: 's27', channel: 'sms', sender: '+91 81XXXXXX27', time: '1:45 PM', scam: true,
      body: 'Pre-approved instant loan ₹2,00,000 at 0% interest, no documents, no credit score check! Money in your account in 5 minutes. [[Download CashJet app from cashjet-loans.apk.link and allow contacts access.]]',
      flag: 'Loan app outside the app store wanting contacts',
      lesson: 'Loan apps outside the official store that want your contacts are often harassment traps.',
    },
    {
      id: 's28', channel: 'call', sender: '+91 72XXXXXX95 · Unknown', time: '9:18 AM', scam: true,
      body: 'Caller: Your loan EMI is due, I am from recovery team.\nYou: I never took any loan.\nCaller: It is in our system with your Aadhaar.\n[[Caller: Pay ₹6,500 processing charge now on this UPI ID or we will file FIR and message your office.]]',
      flag: 'Pay up for a loan you never took',
      lesson: 'If you never took a loan, don\'t pay anything. Check your credit report and report the number on 1930.',
    },
    // ---- OTP sharing ----
    {
      id: 's29', channel: 'call', sender: '+91 90XXXXXX44 · Unknown', time: '11:55 AM', scam: true,
      body: 'Caller: Sir, I am calling from Sapphire Bank, your credit card reward points of ₹7,200 are expiring today.\nCaller: I will convert them to cash for you.\n[[Caller: You will get an OTP now, just read it out to me.]]',
      flag: 'Caller asks you to read out an OTP',
      lesson: 'Real banks never ask for your OTP. Whoever asks for it is trying to take your money.',
    },
    {
      id: 's30', channel: 'whatsapp', sender: '+91 86XXXXXX57', time: '10:48 PM', scam: true,
      body: 'Hi, I accidentally sent my chat app verification code to your number. [[Can you please forward me the 6-digit code you just got?]] It\'s urgent, thanks!',
      flag: 'Stranger wants your verification code',
      lesson: 'That code logs someone into YOUR account. Never forward a verification code to anyone.',
    },
    {
      id: 's31', channel: 'sms', sender: '+91 77XXXXXX16', time: '5:22 PM', scam: true,
      body: 'Nimbus Mobile: Your SIM will be deactivated in 24 hrs due to e-KYC failure. This is as per new government rules for all users. [[Reply with the OTP you receive to keep your number active.]]',
      flag: 'Reply with an OTP to "keep" your SIM',
      lesson: 'Sharing an OTP can let a scammer swap your SIM and catch all your bank codes.',
    },
    {
      id: 's32', channel: 'call', sender: '+91 84XXXXXX38 · Unknown', time: '2:14 PM', scam: true,
      body: 'Caller: Hello, I am the delivery boy from QuickKart, I am at your gate.\nCaller: Address is not clear in the system.\n[[Caller: I have sent a code to your phone, tell me so I can update the address.]]\nCaller: Fast please, many deliveries pending.',
      flag: 'Code requested to "update address"',
      lesson: 'Updating an address never needs an OTP. That code is probably for a payment or login.',
    },
    // ---- Screen-sharing app ----
    {
      id: 's33', channel: 'call', sender: '+91 95XXXXXX81 · Unknown', time: '3:50 PM', scam: true,
      body: 'Caller: I am from PayZing technical team. Your UPI has a server error, payments will fail.\n[[Caller: Install "AnyHelp Remote" from the store and give me the 9-digit code on screen.]]\nCaller: I will fix it in 2 minutes.',
      flag: 'Install a remote-access app',
      lesson: 'Remote-access apps let a stranger see your screen and OTPs. No payment app fixes errors this way.',
    },
    {
      id: 's34', channel: 'email', sender: 'Banyan Bank Support <care@banyanbank-support.help>', time: '9:27 AM', scam: true,
      body: 'Suspicious activity on your net banking\n\nWe have blocked a suspicious transaction of ₹48,000. [[Our executive will connect to your computer through screen share to secure it, please accept the request.]] Do not log out.',
      flag: 'Screen-share to "secure" your account',
      lesson: 'Real banks block fraud on their side. They never need to see or control your screen.',
    },
    {
      id: 's35', channel: 'whatsapp', sender: '+91 67XXXXXX12', time: '8:44 PM', scam: true,
      body: 'Your StreamBox subscription failed. To restore your account, our agent will help you. [[Turn on screen sharing in this chat while you open your bank app.]]',
      flag: 'Screen-share while banking',
      lesson: 'Never open a bank app while sharing your screen with anyone.',
    },
    // ---- Fake refund ----
    {
      id: 's36', channel: 'sms', sender: '+91 92XXXXXX63', time: '4:16 PM', scam: true,
      body: 'Income Tax refund of ₹15,490 approved for you. Your refund reference is ITR-2025-77812. [[Click itr-refund-status.in.net and enter your net banking ID and password to receive.]]',
      flag: 'Net banking password to "receive" a refund',
      lesson: 'Tax refunds go straight to your linked bank account. Nobody needs your password to send them.',
    },
    {
      id: 's37', channel: 'whatsapp', sender: '+91 64XXXXXX78', time: '1:28 PM', scam: true,
      body: 'Hello from ShopNest Returns! Your return refund of ₹1,299 is ready. [[Scan this QR code and enter your UPI PIN to receive the refund.]]',
      flag: 'Scan a QR to "receive" money',
      lesson: 'Scanning a QR code always means YOU pay. Nobody receives money by scanning.',
    },
    {
      id: 's38', channel: 'email', sender: 'StreamBox Billing <billing@streambox-refunds.org>', time: '11:11 PM', scam: true,
      body: 'You were charged twice\n\nOur system charged you ₹649 twice this month. [[To get your refund, confirm your card details on the secure refund page within 12 hours.]] StreamBox Billing Team.',
      flag: 'Card details for a "double charge" refund',
      lesson: 'Real refunds go back to your card automatically. A deadline plus a card form means phishing.',
    },
    // ---- Investment / crypto doubling ----
    {
      id: 's39', channel: 'whatsapp', sender: 'Stock Gurus VIP 📈 (group)', time: '7:05 AM', scam: true,
      body: 'Today\'s IPO allotment secret only for VIP members. Members made 300% this week! [[Invest ₹50,000 now through our app, guaranteed to double in 30 days.]]',
      flag: '"Guaranteed to double"',
      lesson: 'Nobody can guarantee doubled money. "Guaranteed high returns" is the classic investment fraud.',
    },
    {
      id: 's40', channel: 'sms', sender: '+91 80XXXXXX29', time: '6:58 PM', scam: true,
      body: 'Bitcoin is booming! Rahul from Pune turned ₹10,000 into ₹4 lakh. [[Send ₹10,000 to our wallet and get ₹40,000 back in 7 days, 100% safe.]]',
      flag: 'Send money, get 4x back',
      lesson: 'Money that grows 4x in a week only exists in scams. Real investments carry risk and say so.',
    },
    {
      id: 's41', channel: 'email', sender: 'Arjun M. <arjun.wealth.mentor@inboxmail.example>', time: '10:15 AM', scam: true,
      body: 'Re: our chat on the dating app\n\nIt was lovely talking to you. My uncle works at a crypto exchange and shares insider signals. [[Open an account on goldcoinx-trade.vip and deposit ₹25,000, I will guide you to triple it.]]',
      flag: 'Online "friend" pushing a trading site',
      lesson: 'A new online friend who steers you to a trading site is a "pig-butchering" scam. Never invest on a stranger\'s tip.',
    },
    // ---- Sextortion (non-graphic) ----
    {
      id: 's42', channel: 'whatsapp', sender: '+91 60XXXXXX93', time: '12:30 AM', scam: true,
      body: 'I recorded our video call. I have your contact list. [[Pay ₹30,000 in 1 hour or I share the video with your family and friends.]]',
      flag: 'Blackmail with a deadline',
      lesson: 'Don\'t pay; paying brings more demands. Block, save proof and report on 1930. You are not alone.',
    },
    {
      id: 's43', channel: 'email', sender: 'Unknown <no-reply@darkmail.example>', time: '3:33 AM', scam: true,
      body: 'I know your password\n\nI hacked your device and recorded you through your camera. [[Send ₹40,000 in Bitcoin within 48 hours or the recording goes to all your contacts.]] As proof, I already know one of your old passwords.',
      flag: 'Bitcoin ransom with a "recording" claim',
      lesson: 'This is a mass email. A leaked old password isn\'t proof of any recording. Change the password and ignore it.',
    },
    // ---- Friend in need, new number ----
    {
      id: 's44', channel: 'whatsapp', sender: '+91 68XXXXXX05', time: '9:50 PM', scam: true,
      body: 'Hi Maa, this is my new number, old phone fell in water. Please save this one and delete the old one. [[I need ₹18,000 urgently for my hostel fees, send to this UPI ID, can\'t talk now.]]',
      flag: 'New number + urgent money + can\'t talk',
      lesson: 'Call the old number or ask a question only they know before sending money.',
    },
    {
      id: 's45', channel: 'whatsapp', sender: '+91 69XXXXXX66', time: '11:36 AM', scam: true,
      body: 'Hey it\'s Vikram from college! Saved my new number? I\'m stuck at the airport, my card got blocked. [[Can you pay ₹12,000 to this QR, I\'ll return it tonight, please don\'t call, low battery.]]',
      flag: 'Stranded friend who "can\'t call"',
      lesson: '"Don\'t call" is the giveaway. A real friend can speak to you for 10 seconds.',
    },
    {
      id: 's46', channel: 'whatsapp', sender: 'Rohit Boss (+91 61XXXXXX77)', time: '8:20 AM', scam: true,
      body: 'Hi, I\'m in a client meeting, can\'t take calls. Need a favour. [[Buy 5 ShopNest gift cards of ₹5,000 each and send me the codes, I\'ll reimburse later.]]',
      flag: 'Boss wants gift-card codes',
      lesson: 'Gift-card codes are cash that can\'t be traced. No real manager asks for them by chat.',
    },
    // ---- Fake delivery fee / traffic challan / tax ----
    {
      id: 's47', channel: 'sms', sender: '+91 79XXXXXX48', time: '10:39 AM', scam: true,
      body: 'SwiftPost: We could not deliver your package because the address is incomplete. [[Update address and pay ₹25 redelivery fee at swiftpost-redeliver.top]] within 12 hours.',
      flag: 'Lookalike link with a small fee',
      lesson: 'Couriers don\'t ask for small fees by SMS links. Track only in the courier\'s official app or site.',
    },
    {
      id: 's48', channel: 'whatsapp', sender: '+91 66XXXXXX21', time: '5:05 PM', scam: true,
      body: 'Traffic e-Challan: Your vehicle has a pending fine of ₹500 for overspeeding. [[Download "eChallan.apk" to view the photo and pay.]] Pay today to avoid court.',
      flag: 'Challan as an .apk download',
      lesson: 'Traffic fines never come as app files. An .apk can steal your SMS and OTPs.',
    },

    // =================== LEGIT (48) ===================
    // ---- OTPs and security codes (look scary, are real) ----
    {
      id: 'l01', channel: 'sms', sender: 'AX-SAPHBK-T', time: '9:41 AM', scam: false,
      body: '482913 is your OTP to log in to Sapphire Bank. Valid for 5 minutes. Do not share it with anyone, including bank staff. -Sapphire Bank',
      flag: 'Registered sender, says "do not share"',
      lesson: 'An OTP message that warns you not to share it is normal. Just never read it out to anyone.',
    },
    {
      id: 'l02', channel: 'sms', sender: 'VM-PAYZNG-T', time: '1:15 PM', scam: false,
      body: 'Use 7731 to verify your new device on PayZing. If this was not you, ignore this message. PayZing will never call you for this code.',
      flag: 'Code only, no link, no request',
      lesson: 'A code you didn\'t ask for? Ignore it. The message itself is harmless as long as you keep the code.',
    },
    {
      id: 'l03', channel: 'sms', sender: 'JD-QKKART-T', time: '6:02 PM', scam: false,
      body: 'Your QuickKart delivery code is 3308. Share it with the delivery agent only after you receive your order 4021XX-77. Never share it on a call.',
      flag: 'Code for a delivery at your door',
      lesson: 'Delivery codes are handed over at the door when the parcel is in your hand, never over the phone.',
    },
    {
      id: 'l04', channel: 'email', sender: 'Banyan Bank <alerts@banyanbank.in>', time: '7:30 AM', scam: false,
      body: 'Your password was changed\n\nThe net banking password for your account ending 4417 was changed today at 7:28 AM. If you did this, no action is needed. If you didn\'t, block access in the Banyan Bank app or call the number on the back of your card.',
      flag: 'No link, points to the app and your card',
      lesson: 'Real security alerts send you to the official app or the number on your card, not to a link.',
    },
    // ---- Bank alerts ----
    {
      id: 'l05', channel: 'sms', sender: 'AX-SAPHBK-T', time: '8:47 PM', scam: false,
      body: 'Sapphire Bank: ₹2,340.00 debited from A/c XX4521 on 12-Oct to QUICKKART via UPI. Not you? Call the number on the back of your card to block.',
      flag: 'Debit alert, call the number on your card',
      lesson: 'A debit alert that says "call the number on your card" is exactly what real banks do.',
    },
    {
      id: 'l06', channel: 'sms', sender: 'VK-PEACOK-T', time: '10:05 AM', scam: false,
      body: 'Dear Customer, your Peacock Bank credit card ending 9021 has been blocked after 3 wrong PIN attempts. To unblock, use the Peacock Bank app or visit any branch.',
      flag: 'Card blocked, fix it in the app or branch',
      lesson: 'Scary but real: it asks for nothing and sends you to the app or a branch.',
    },
    {
      id: 'l07', channel: 'sms', sender: 'BZ-BANYAN-T', time: '1:00 AM', scam: false,
      body: 'Salary of ₹48,250.00 credited to your Banyan Bank A/c XX7708 on 01-Oct. Available balance ₹61,904.12.',
      flag: 'Credit alert, nothing asked',
      lesson: 'Credit alerts just inform you. No link, no request, no deadline.',
    },
    {
      id: 'l08', channel: 'call', sender: 'Sapphire Bank (saved contact)', time: '4:22 PM', scam: false,
      body: 'Caller: Hello, this is Sapphire Bank fraud monitoring. We blocked a card payment of ₹19,999 that looked unusual.\nCaller: I won\'t ask for any PIN, OTP or card number.\nCaller: Please call back on the number on the back of your card to confirm whether it was you.',
      flag: 'Asks nothing, tells you to call back',
      lesson: 'A real fraud team is happy for you to hang up and call the number on your card.',
    },
    {
      id: 'l09', channel: 'email', sender: 'Sapphire Bank <statements@sapphirebank.in>', time: '6:00 AM', scam: false,
      body: 'Your e-statement for September is ready\n\nYour account statement is available in the Sapphire Bank app under Accounts > Statements. For your security we don\'t attach statements or include login links in emails.',
      flag: 'Real domain, no link, no attachment',
      lesson: 'The sender is the real sapphirebank.in, and it tells you to open the app yourself.',
    },
    {
      id: 'l10', channel: 'sms', sender: 'AD-MONSUN-T', time: '11:30 AM', scam: false,
      body: 'Monsoon Mutual Bank: Your FD of ₹1,00,000 matures on 25-Oct. It will be auto-renewed for 1 year unless you change it in the app or at your branch.',
      flag: 'Information only, change it yourself in the app',
      lesson: 'A reminder that leaves the choice to you in the official app is normal banking.',
    },
    // ---- Delivery updates ----
    {
      id: 'l11', channel: 'sms', sender: 'JD-SWFTPT-S', time: '9:10 AM', scam: false,
      body: 'SwiftPost: Your parcel SP48XX21 is out for delivery today between 2 and 6 PM. No payment is due. Track in the SwiftPost app.',
      flag: '"No payment due", no link',
      lesson: 'A delivery update that asks for no money and has no link is fine.',
    },
    {
      id: 'l12', channel: 'sms', sender: 'VM-QKKART-S', time: '7:45 PM', scam: false,
      body: 'Your QuickKart order of Steel Water Bottle (2) was delivered. Rate your experience in the QuickKart app.',
      flag: 'Order you can check in the app',
      lesson: 'Delivered-order messages that point to the app are routine.',
    },
    {
      id: 'l13', channel: 'whatsapp', sender: 'SwiftPost ✔ Business', time: '3:35 PM', scam: false,
      body: 'Hi! Delivery attempt failed today because nobody was home. We will try again tomorrow. You can also pick it up from the SwiftPost office at Sector 14. No fees apply.',
      flag: 'No fee, no link, just a retry',
      lesson: 'Missed-delivery notes that ask for no money and no details are normal.',
    },
    {
      id: 'l14', channel: 'call', sender: '+91 73XXXXXX52 · Unknown', time: '12:58 PM', scam: false,
      body: 'Caller: Hi, SwiftPost delivery, I\'m near your building with a parcel.\nCaller: Is it the blue gate or the white gate?\nYou: White gate, I\'ll come down.\nCaller: Okay, two minutes.',
      flag: 'Asks only for directions',
      lesson: 'Delivery riders often call from personal numbers. Directions are fine; codes and money are not.',
    },
    // ---- Bills and recharges ----
    {
      id: 'l15', channel: 'sms', sender: 'VM-BRGRID-S', time: '10:20 AM', scam: false,
      body: 'BrightGrid Power: Bill of ₹1,284 for CA 30XXXX17 is due on 20-Oct. Pay in the BrightGrid app or at brightgridpower.in. Ignore if already paid.',
      flag: 'Normal bill from the real domain',
      lesson: 'A real bill gives an amount, due date and the official site, with no threats.',
    },
    {
      id: 'l16', channel: 'sms', sender: 'VK-NIMBUS-S', time: '8:00 AM', scam: false,
      body: 'Nimbus Mobile: Your ₹299 plan expires in 3 days. Recharge in the Nimbus app or any store to stay connected.',
      flag: 'Recharge reminder, your choice where',
      lesson: 'Plan-expiry reminders that let you recharge anywhere are normal.',
    },
    {
      id: 'l17', channel: 'email', sender: 'StreamBox <billing@streambox.in>', time: '9:00 PM', scam: false,
      body: 'Your StreamBox membership renews on 18 Oct\n\nYour plan (₹649/month) will renew automatically using your saved card ending 2290. To cancel or change your plan, open StreamBox and go to Account.',
      flag: 'Renewal notice, manage it in the app',
      lesson: 'A renewal notice that tells you to manage things in the app, not via a link, is fine.',
    },
    {
      id: 'l18', channel: 'sms', sender: 'BP-AQUAJL-S', time: '7:12 AM', scam: false,
      body: 'City Water Board: Water supply in Ward 12 will be off on 15-Oct from 10 AM to 4 PM for pipeline repair. Please store water in advance.',
      flag: 'Public notice, asks for nothing',
      lesson: 'Service notices that don\'t ask for money or details are harmless.',
    },
    // ---- New device / login ----
    {
      id: 'l19', channel: 'email', sender: 'QuickKart <no-reply@quickkart.in>', time: '11:58 PM', scam: false,
      body: 'New sign-in to your QuickKart account\n\nWe noticed a new sign-in from Chrome on Windows in Pune. If this was you, you\'re all set. If not, open the QuickKart app and change your password.',
      flag: 'Real domain, sends you to the app',
      lesson: 'Login alerts from the real domain that send you to the app (not a link) are normal.',
    },
    {
      id: 'l20', channel: 'sms', sender: 'AX-SAPHBK-T', time: '2:26 PM', scam: false,
      body: 'Sapphire Bank: You requested to register a new mobile for net banking. If this wasn\'t you, call the number on the back of your card immediately. We never ask for OTPs.',
      flag: 'Warning that says "we never ask for OTPs"',
      lesson: 'Real bank messages repeat the golden rule: they never ask for your OTP.',
    },
    // ---- Friends and family ----
    {
      id: 'l21', channel: 'whatsapp', sender: 'Aarav (Bhai)', time: '10:40 PM', scam: false,
      body: 'Reached Bangalore safely. Flight was delayed but all good. Will call you tomorrow morning.',
      flag: 'Saved contact, nothing asked',
      lesson: 'A known contact sharing news is just life.',
    },
    {
      id: 'l22', channel: 'whatsapp', sender: 'Mummy', time: '6:15 PM', scam: false,
      body: 'Beta my phone balance is over, can you recharge my number with the ₹299 plan? Same number as always. Call me after.',
      flag: 'Saved contact, her own number, call-me',
      lesson: 'A saved contact asking for a small recharge on her usual number, and asking you to call, is normal.',
    },
    {
      id: 'l23', channel: 'whatsapp', sender: 'Kavya (Office)', time: '9:02 AM', scam: false,
      body: 'Hey, running 10 min late for standup. Can you tell the team to start without me?',
      flag: 'Saved colleague, harmless request',
      lesson: 'Normal work chat: no money, no codes, no urgency tricks.',
    },
    {
      id: 'l24', channel: 'whatsapp', sender: 'Flat 4B Residents (group)', time: '8:30 AM', scam: false,
      body: 'Ramesh (Secretary): Lift maintenance today from 11 to 1. Please use the stairs. Sorry for the trouble!',
      flag: 'Group notice, asks for nothing',
      lesson: 'Building notices that ask for nothing are routine.',
    },
    {
      id: 'l25', channel: 'whatsapp', sender: 'Sneha', time: '7:58 PM', scam: false,
      body: 'Dinner was so fun! Total was ₹2,400, so ₹600 each. I\'ll send a PayZing request, pay whenever.',
      flag: 'Known friend, expected bill split',
      lesson: 'Paying a friend for a bill you shared is legit. You know why and how much.',
    },
    {
      id: 'l26', channel: 'whatsapp', sender: 'Papa', time: '1:12 PM', scam: false,
      body: 'Your cousin\'s wedding is on 22 Nov in Jaipur. I booked train tickets for all of us. Take leave from office.',
      flag: 'Family news, nothing asked',
      lesson: 'No link, no money, no secret: just family plans.',
    },
    {
      id: 'l27', channel: 'call', sender: 'Dadi (saved contact)', time: '5:45 PM', scam: false,
      body: 'Caller: Hello beta, did you eat?\nYou: Yes Dadi, just now.\nCaller: Come home this Sunday, I\'m making kheer.',
      flag: 'Saved contact, just love',
      lesson: 'Not every call is a trap. Grandma just wants you home on Sunday.',
    },
    {
      id: 'l28', channel: 'whatsapp', sender: 'Coach Imran (Cricket club)', time: '6:40 AM', scam: false,
      body: 'Practice moved to Ground 2 today because of the tournament. Same time, 7 AM. Bring white kit.',
      flag: 'Saved contact, routine update',
      lesson: 'A known contact with a routine update is fine.',
    },
    // ---- UPI screens that are legit ----
    {
      id: 'l29', channel: 'upi', sender: 'sneha.r@payzing', time: '8:05 PM', scam: false,
      body: 'Collect request ₹600 from Sneha R. Note: Dinner split Saturday',
      flag: 'Expected request from a known friend',
      lesson: 'A collect request means YOU pay. Fine when it\'s a friend\'s bill split you agreed to.',
    },
    {
      id: 'l30', channel: 'upi', sender: 'quickkart.refunds@sapphire', time: '3:10 PM', scam: false,
      body: 'Money received ₹799 from QuickKart Refunds. Note: Refund for order 4021XX-77. Credited to A/c XX4521.',
      flag: 'Money already received, nothing to do',
      lesson: 'Real refunds just arrive. No PIN, no QR, no approval needed.',
    },
    {
      id: 'l31', channel: 'upi', sender: 'brightgrid.bills@banyan', time: '10:25 AM', scam: false,
      body: 'Payment successful ₹1,284 to BrightGrid Power. Note: Bill for CA 30XXXX17, Oct. UPI Ref 2851XXXX4410.',
      flag: 'Your own payment receipt',
      lesson: 'A receipt for a bill you just paid is legit.',
    },
    {
      id: 'l32', channel: 'upi', sender: 'aarav.k@peacock', time: '9:30 PM', scam: false,
      body: 'Money received ₹1,500 from Aarav K. Note: Movie tickets, thanks!',
      flag: 'Money received, nothing asked',
      lesson: 'Receiving money needs no action from you. That\'s how you know it\'s real.',
    },
    {
      id: 'l33', channel: 'upi', sender: 'flat4b.society@monsoon', time: '11:00 AM', scam: false,
      body: 'Collect request ₹2,500 from Flat 4B Residents Welfare. Note: October maintenance, as per notice dated 1 Oct',
      flag: 'Expected monthly payment',
      lesson: 'A request for a bill you expected and recognise is fine to pay. Check the amount first.',
    },
    // ---- Jobs, services, appointments ----
    {
      id: 'l34', channel: 'email', sender: 'QuickKart Careers <careers@quickkart.in>', time: '4:45 PM', scam: false,
      body: 'Interview scheduled: Data Analyst\n\nThanks for applying. Your video interview is on 16 Oct at 11 AM; the invite is in your candidate portal. QuickKart never charges candidates any fee at any stage of hiring.',
      flag: 'Real domain, no fee, says so',
      lesson: 'Real hiring emails come from the company domain and never ask for money.',
    },
    {
      id: 'l35', channel: 'email', sender: 'ShopNest HR <talent@shopnest.in>', time: '12:15 PM', scam: false,
      body: 'Next steps for your application\n\nCongratulations on clearing round 1! Our recruiter Meera will call you this week to schedule round 2. Please keep your updated resume ready.',
      flag: 'Expected next step, nothing to pay',
      lesson: 'A job update for something you applied to, with no payment, is normal.',
    },
    {
      id: 'l36', channel: 'sms', sender: 'VM-CITYCL-S', time: '5:00 PM', scam: false,
      body: 'Reminder: Your appointment with Dr Mehta at CityCare Clinic is tomorrow at 10:30 AM. Reply C to cancel. Please carry previous reports.',
      flag: 'Appointment reminder, no money',
      lesson: 'Reminders for appointments you booked are fine.',
    },
    {
      id: 'l37', channel: 'email', sender: 'RideRover <receipts@riderover.in>', time: '11:42 PM', scam: false,
      body: 'Your Thursday night ride with RideRover\n\nTotal ₹286 paid by UPI. Pickup: MG Road, Drop: Indiranagar. Something wrong? Report it under Help in the app.',
      flag: 'Ride receipt, help is in the app',
      lesson: 'Receipts that send you to "Help" in the app are standard.',
    },
    {
      id: 'l38', channel: 'sms', sender: 'VK-TIFFTP-S', time: '1:22 PM', scam: false,
      body: 'TiffinTap: Your order from Annapurna Thali is on the way! Rider Suresh will reach in 20 mins. Pay on delivery: ₹240.',
      flag: 'Order you placed, pay at the door',
      lesson: 'Paying for food at your door, for an order you placed, is fine.',
    },
    {
      id: 'l39', channel: 'sms', sender: 'AX-RLYTRA-S', time: '9:55 PM', scam: false,
      body: 'RailYatra: PNR 4XXXXXXX21 confirmed. Train 12XXX, 22-Nov, Coach B2, Seats 33-36. Have a safe journey.',
      flag: 'Booking confirmation, nothing asked',
      lesson: 'A booking confirmation that asks for nothing is legit.',
    },
    {
      id: 'l40', channel: 'email', sender: 'SunShield Insurance <renewals@sunshieldinsurance.in>', time: '10:10 AM', scam: false,
      body: 'Your bike insurance expires in 15 days\n\nPolicy ending 7781 expires on 27 Oct. You can renew in the SunShield app or through your agent. Riding without valid insurance is an offence, so please renew on time.',
      flag: 'Real domain, renew via app or agent',
      lesson: 'Renewal reminders are normal when they let you renew through your own trusted channel.',
    },
    {
      id: 'l41', channel: 'sms', sender: 'VM-GRNVLY-S', time: '3:30 PM', scam: false,
      body: 'Green Valley School: PTM for Class 5 is on Saturday 18 Oct, 9 AM to 12 PM. Please bring the report card diary.',
      flag: 'School notice, asks for nothing',
      lesson: 'School notices without money requests or links are fine.',
    },
    {
      id: 'l42', channel: 'call', sender: 'CityCare Clinic (saved contact)', time: '11:05 AM', scam: false,
      body: 'Caller: Hello, calling from CityCare Clinic. Dr Mehta is running late tomorrow.\nCaller: Can we move your appointment from 10:30 to 12?\nYou: Sure, that works.',
      flag: 'Known clinic, reschedule only',
      lesson: 'Rescheduling with a clinic you know is a normal call. No money, no codes.',
    },
    {
      id: 'l43', channel: 'email', sender: 'PayZing <no-reply@payzing.in>', time: '8:20 AM', scam: false,
      body: 'Reset your PayZing password\n\nWe received a request to reset your password from the PayZing app. If you made it, enter the code shown in the app. If you didn\'t, ignore this email; your account is safe.',
      flag: 'Expected reset, "ignore if not you"',
      lesson: '"Ignore this if it wasn\'t you" with no pressure is what real services say.',
    },
    {
      id: 'l44', channel: 'whatsapp', sender: 'TiffinTap ✔ Business', time: '2:05 PM', scam: false,
      body: 'Sorry your thali arrived late! A ₹50 coupon has been added to your TiffinTap account automatically. No action needed.',
      flag: 'Coupon added, no action needed',
      lesson: 'Real compensation is added for you. It doesn\'t need your card or PIN.',
    },
    {
      id: 'l45', channel: 'sms', sender: 'BZ-SAPHBK-T', time: '6:31 PM', scam: false,
      body: 'Sapphire Bank: Your new debit card ending 3390 has been dispatched by SwiftPost, AWB SP77XX09. Activate it in the Sapphire Bank app once received.',
      flag: 'Card dispatch, activate in the app',
      lesson: 'Activation in the bank\'s own app, with no link, is the safe, real way.',
    },
    {
      id: 'l46', channel: 'call', sender: 'Meera (ShopNest HR, saved)', time: '3:00 PM', scam: false,
      body: 'Caller: Hi, this is Meera from ShopNest hiring. Congrats on clearing round 1.\nCaller: Are you free Thursday at 3 for round 2 on video?\nYou: Yes.\nCaller: Great, the invite will come from shopnest.in.',
      flag: 'Expected HR call, no fees',
      lesson: 'A recruiter scheduling an interview you applied for, with no fees, is legit.',
    },
    {
      id: 'l47', channel: 'sms', sender: 'VK-NIMBUS-S', time: '12:00 PM', scam: false,
      body: 'Nimbus Mobile: You have used 80% of your daily data. Speed will reduce after 100%. Data resets at midnight.',
      flag: 'Usage info, nothing asked',
      lesson: 'Usage alerts are just information.',
    },
    {
      id: 'l48', channel: 'whatsapp', sender: 'Priya (College)', time: '10:18 AM', scam: false,
      body: 'Did you get the notes for Unit 3? I\'ll bring them to the library at 4. Also, happy birthday in advance! 🎂',
      flag: 'Saved friend, nothing suspicious',
      lesson: 'Friends chatting about notes and birthdays: legit.',
    },
  ],
};
