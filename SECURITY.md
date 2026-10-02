# Security

Do not commit credentials, session cookies, `.env` files, private keys, settings, or diagnostic reports. Generated reports can contain URLs, local paths, and system details and belong only in the ignored `outputs/` directory.

If you find a security issue, use GitHub's private vulnerability reporting when available. Do not post live credentials or private session data in a public issue.

The repository and portable release require no embedded API credentials. The native helper is compiled locally from the included C# source and only operates on windows owned by its parent application process.
