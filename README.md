> **This is a legacy example from Finic's former web automation product, which no longer exists. It is no longer maintained.** Finic now builds AI to stop fraud, abuse and financial crimes: [Finic Grayson](https://docs.finic.ai), a decision model API for real-time fraud and risk decisions, and agents for fraud investigations. See [finic.ai](https://finic.ai).

# Amazon Receipts Scraper

Run the script with:

```
# Install packages
npm i

# Install playwright
npx playwright install

# Start the script
npm start
```

When the login page pops up, login using your Amazon credentials. Once you log in the script will navigate to the Orders page and download all invoices to `/invoices`
