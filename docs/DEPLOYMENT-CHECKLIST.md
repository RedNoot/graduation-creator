# Netlify Deployment Checklist

## Pre-Deployment Setup

### 1. Netlify Environment Variables
Set these in your Netlify dashboard under Site Settings > Environment Variables:

**Frontend Firebase Configuration:**
- `FIREBASE_API_KEY` = "AIzaSyDH7bp9-HnNefk27NLaOq1gx5VF4Onenqg"
- `FIREBASE_AUTH_DOMAIN` = "graduation-creator.firebaseapp.com"
- `FIREBASE_PROJECT_ID` = "graduation-creator"
- `FIREBASE_STORAGE_BUCKET` = "graduation-creator.firebasestorage.app"
- `FIREBASE_MESSAGING_SENDER_ID` = "215273409051"
- `FIREBASE_APP_ID` = "1:215273409051:web:73e80f9c6057fd7d6686be"

**Backend Firebase Configuration (for functions):**
- `FIREBASE_CLIENT_EMAIL` = `firebase-adminsdk-fbsvc@graduation-creator.iam.gserviceaccount.com`
- `FIREBASE_PRIVATE_BASE_64_KEY` = `LS0tLS1CRUdJTiBQUklWQVRFIEtFWS0tLS0tCk1JSUV2UUlCQURBTkJna3Foa2lHOXcwQkFRRUZBQVNDQktjd2dnU2pBZ0VBQW9JQkFRRG9WeUx4STF6K1JaVWUKZytxRjFpRGtUb080bWNqckpZS0hqSGhtNG1qVlU0OE5tZUJrb2thZmgvWlZPb1ZVYWV6Vm05Z2o1VWlSanZ3WApWcldlYWFIWnp3VzFteHZpOVNNUG1Cb3ZKRnpBZWYwYldPRTRpbWZNTWFtd0U3Mi9kSDQ1dWZDZUtxaEtaZXhNCkp6UVdBVHJ2YlB6eXFERVVjRGtRSWNySURlWm9DbVpjelRWdGVGeHhUaFE2alozYnB1Q2g0Y214ajVyZmhwcjgKdW9tTUZ3YzZIdHB1L3hPUGhaT0M2RlNnVlRacnhUVnZySXNrRnoyTDR2Wnk3ZHFhUW1nMmdMK3JUYlFCOG12NwowVFFPRGZ2NzdaT2NjOUR4aWl0RlEyUGczWFJGQ1hHTWcrejAzMzhJdFNrQkwyNEQwcy9KOGFUMHJjTHVSaXQ4CkVxdlBlZ2JiQWdNQkFBRUNnZ0VBUll1M29OaUdBSEtSbFVYRlVIUnMrZ25xY2JwT290eGlldko0STh2SHQzdEEKaWNDeW8welR1UEw0c0VCSklxQm1UUFpPTjBodGRXeUlWdkFVZ3l0NVQvb2c2bUJZYzVJUEFaNzB6NEdoNWRkZQpCTzZRMDl6Ui94UXFoOU1RN0JzUm9YUGY2MmczWWJXcWlvejlrVXlpK0lIMklTaHBNSVg2L3JJdXdiMHZaNXFMClFCcWQ4b3pMbVdvWDNsM0FxaUt2ZzA2ZitBc0ttWllQSTdCREZEV3JOMGFnZzY2cmZ3VU00MDFUdTFiRlZKVVMKcFFBN3phcE9FUm5vNm5wYjQ2RVRCL0Z4ZDNMUDBadTdONlJ0alJzUm4vU0ZhODFLUEJKZHluQmV4cUpLNm1nZgppVXlKNFdLRHp1MVMyUDZ0cCthMFovVDJzbVNxbW4zSUU2cHhObHlEOFFLQmdRRDdueHMyLzhFUmIxYUNBSzZaCnEybi9RL2hRNGtHWmllUmk3SUVUSzd3MXcwY1VzbGFnWnNHOWtzQ0Z6cXdXU3J1a2RaODNMdUtubW1sNWtnVTgKWTJBdWY2YTJJcll3eVNvYmtSK2tYU1JDa1RXdmI2NlFaVHcrR3g1Z0liejl3OC96NWlQQ2ZFR3lGUnNkNHFKWAppSVVOVGovSlN3YlFqWWk5ZUoyeFlEcy9Nd0tCZ1FEc1lpT05zRElRaHoreE9TODRmbkQ2Nnl6cEJHZVdjcFV5CjRzZUtMaE9teXJESU13Z0RFSW1IcVFFdUFtVStoSVpMV3NRNWxkWFZkd081cVBKejdzOCtCVC9WanFTejJuTloKTlNEY2haNU1vZTQ1NkphcDJ5ZzZIMW1udC9ZbDM1TXJwdDdkZHZRemxWUFdmM3FkSENiMVZIenVvZktzNlVOWApLRU9TcWcwNXVRS0JnSGJvMHRpajlwNkJxalVYazJ1bG1ScjhDUTVZVGozNzcwVmNsUWIxUlNWM0dsRktraXVOClJBT05wWlBXZm5hdWJJeWsxVkFqeFJNRm90REQwOXVjN3VncWhTTlB0aC9LQVM4ejN1c3k1UjdjTnEyb3Jxc28KWEZiUlJBS1VEeGN4Z1VXMnZiRjhQU09tVzhFOHlCRnJ2OHp3N0szNDJjaVhDa2JZQ0ZXNXIyWUhBb0dCQUpnZwpmS01XRHRKR1NLZDAxdWZ6cjhBOEU5WU9xSi9STkNYZ2Z1eDF4TjNsdWluTmRjMkxHZ2Q5ZzYzWml0RFdOeHROCjJkVDVrZmxrTTdpTGV5V1RQanE2NUI4TFF3SWdoM1dVMUlZM1UrNGJsSlllRXNCVHM2cmNQRFhORlpQQU5CVzIKdWQwclRmUFltWEVFNzZNbTJBZXhEUW9Dbll3Y1B1TmJuVWxKT1dPNUFvR0FGNkdSekZtaFhwQTIrT1VUWlFmVwpaT25hOHJyaWhlQlhOVUpGRVYyZXdmTEhxWTRGZUxpazJIVGFkTk05R2piYTNnRDc2ZVNEUkZwNFBhMEI1eW4yClZRMFFFRTJtcE5ROUtSN0tDUFVMQUhyNWRXOU1lajJFM2VHSWpic3lmZUVmWGdyVzViSjBWbXZONTdZRW1tK08KaklxbDcvYld3WXVrSTJzKzVrUG9KKzg9Ci0tLS0tRU5EIFBSSVZBVEUgS0VZLS0tLS0=`

**Cloudinary Configuration:**
- `CLOUDINARY_CLOUD_NAME` = "dkm3avvjl"
- `CLOUDINARY_UPLOAD_PRESET` = "Graduation-Uploads"

### 2. Firebase Setup
- ✅ Enable Authentication (Email/Password)
- ✅ Enable Firestore Database
- ✅ Set up security rules for Firestore
- ✅ Generate service account key for backend functions

### 3. Cloudinary Setup
- ✅ Create upload preset "Graduation-Uploads"
- ✅ Configure upload preset settings
- ✅ Set folder structure if needed

### 4. Netlify Functions
- ✅ Functions are in `netlify/functions/` directory
- ✅ `package.json` is configured in functions directory
- ✅ Dependencies are properly listed

## Deployment Steps

1. **Connect Repository:**
   - Link your GitHub repository to Netlify
   - Set build command: (none needed - static site)
   - Set publish directory: `.` (root)

2. **Configure Environment Variables:**
   - Add all variables listed above in Netlify dashboard

3. **Deploy:**
   - Netlify will automatically build and deploy
   - Functions will be available at `/.netlify/functions/`

4. **Test Deployment:**
   - Test authentication flow
   - Test file uploads to Cloudinary
   - Test Firestore operations
   - Test serverless functions

## Security Features Enabled

- ✅ Content Security Policy headers
- ✅ X-Frame-Options protection
- ✅ XSS Protection
- ✅ Content type sniffing protection
- ✅ Referrer policy
- ✅ Permissions policy

## Performance Features

- ✅ Static asset caching (1 year)
- ✅ HTML no-cache for updates
- ✅ SPA routing configured
- ✅ Gzip compression (automatic on Netlify)

## Monitoring & Maintenance

- Set up Netlify analytics
- Monitor function logs
- Set up error tracking
- Regular security updates