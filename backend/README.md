# OneClickNotes Backend API

A robust Node.js + Express + MongoDB backend API for the OneClickNotes application, featuring comprehensive note management, user authentication, and file uploads.

## 🚀 Features

### Authentication & User Management
- ✅ User registration and login
- ✅ JWT-based authentication
- ✅ Password reset functionality
- ✅ User profile management
- ✅ Account deletion

### Note Management
- ✅ **Text Notes**: Simple text content
- ✅ **Drawing Notes**: SVG drawing data storage
- ✅ **Voice Notes**: Audio file uploads
- ✅ **Photo Notes**: Image file uploads
- ✅ **Super Notes**: Combined content types
- ✅ Note pinning and archiving
- ✅ Private/public note support
- ✅ Soft delete with restore capability
- ✅ Advanced search with text indexing

### File Handling
- ✅ Audio file uploads (voice notes)
- ✅ Image file uploads (photos, drawings)
- ✅ File size validation (10MB limit)
- ✅ Secure file storage
- ✅ File type validation

### Security & Performance
- ✅ Rate limiting (100 requests/15min)
- ✅ Input validation and sanitization
- ✅ CORS protection
- ✅ Helmet security headers
- ✅ Request compression
- ✅ MongoDB indexing for performance

## 🏗️ Architecture

```
backend/
├── controllers/          # Business logic
│   ├── authController.js
│   └── noteController.js
├── models/              # Database schemas
│   ├── User.js
│   └── Note.js
├── routes/              # API endpoints
│   ├── authRoutes.js
│   └── noteRoutes.js
├── middlewares/         # Custom middleware
│   ├── authMiddleware.js
│   ├── uploadMiddleware.js
│   └── validationMiddleware.js
├── uploads/             # File storage
├── server.js            # Main server file
├── package.json
└── README.md
```

## 🛠️ Tech Stack

- **Runtime**: Node.js (v18+)
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT + bcrypt
- **File Uploads**: Multer
- **Validation**: express-validator
- **Security**: Helmet, CORS, Rate Limiting
- **Performance**: Compression

## 📋 Prerequisites

- Node.js 18+ installed
- MongoDB instance (local or Atlas)
- npm or yarn package manager

## 🚀 Quick Start

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Environment Setup
```bash
cp env.example .env
# Edit .env with your configuration
```

### 3. Database Setup
- **Local MongoDB**: Install and start MongoDB
- **MongoDB Atlas**: Create cluster and get connection string

### 4. Start Development Server
```bash
npm run dev
```

The API will be available at `http://localhost:5000`

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 5000 |
| `NODE_ENV` | Environment | development |
| `MONGODB_URI` | MongoDB connection string | - |
| `JWT_SECRET` | JWT signing secret | - |
| `FRONTEND_URL` | Frontend URL for CORS | http://localhost:3000 |

### MongoDB Setup

#### Local Installation
```bash
# macOS (using Homebrew)
brew install mongodb-community
brew services start mongodb-community

# Ubuntu
sudo apt-get install mongodb
sudo systemctl start mongodb
```

#### MongoDB Atlas (Cloud)
1. Create account at [MongoDB Atlas](https://cloud.mongodb.com)
2. Create new cluster
3. Get connection string
4. Add to `.env` file

## 📚 API Endpoints

### Authentication Routes

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/register` | User registration |
| `POST` | `/api/auth/login` | User login |
| `POST` | `/api/auth/forgot-password` | Request password reset |
| `POST` | `/api/auth/reset-password` | Reset password with token |
| `GET` | `/api/auth/profile` | Get user profile |
| `PUT` | `/api/auth/profile` | Update user profile |
| `PUT` | `/api/auth/change-password` | Change password |
| `POST` | `/api/auth/logout` | User logout |
| `DELETE` | `/api/auth/account` | Delete account |

### Note Routes

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/notes` | Create new note |
| `GET` | `/api/notes` | Get user notes with filters |
| `GET` | `/api/notes/:id` | Get single note |
| `PUT` | `/api/notes/:id` | Update note |
| `DELETE` | `/api/notes/:id` | Soft delete note |
| `PATCH` | `/api/notes/:id/pin` | Toggle note pin |
| `PATCH` | `/api/notes/:id/archive` | Toggle note archive |
| `PATCH` | `/api/notes/:id/restore` | Restore deleted note |
| `DELETE` | `/api/notes/:id/permanent` | Permanently delete note |
| `GET` | `/api/notes/stats` | Get note statistics |
| `GET` | `/api/notes/search` | Search notes |

## 🔐 Authentication

All protected routes require a JWT token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

### Token Format
```json
{
  "userId": "user_id_here",
  "iat": 1234567890,
  "exp": 1234567890
}
```

## 📝 Note Types

### Text Note
```json
{
  "type": "text",
  "content": "Your text content here",
  "title": "Optional title",
  "mood": "happy",
  "isPrivate": false,
  "tags": ["work", "ideas"]
}
```

### Drawing Note
```json
{
  "type": "draw",
  "drawingData": [
    {
      "path": "M10 10 L20 20",
      "strokeWidth": 2,
      "strokeColor": "#000000"
    }
  ],
  "title": "My Drawing"
}
```

### Voice Note
```json
{
  "type": "voice",
  "content": "Transcription text",
  "file": "audio_file.mp3"
}
```

### Super Note
```json
{
  "type": "supernote",
  "content": "Text content",
  "drawingData": [...],
  "voiceUrl": "audio_url",
  "photoUrl": "image_url"
}
```

## 🔍 Search & Filtering

### Get Notes with Filters
```
GET /api/notes?search=keyword&type=text&showPrivate=true&page=1&limit=20
```

### Search Notes
```
GET /api/notes/search?q=search_term&type=text&showPrivate=true
```

### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `search` | string | Text search in title/content |
| `type` | string | Filter by note type |
| `showPrivate` | boolean | Include private notes |
| `showArchived` | boolean | Include archived notes |
| `page` | number | Page number for pagination |
| `limit` | number | Notes per page |
| `sortBy` | string | Sort field (createdAt, updatedAt) |
| `sortOrder` | number | Sort order (1: asc, -1: desc) |

## 📁 File Uploads

### Supported File Types
- **Audio**: MP3, WAV, M4A, etc.
- **Images**: JPG, PNG, GIF, SVG
- **Drawings**: SVG files

### Upload Limits
- **File Size**: 10MB maximum
- **Files per Request**: 1 file
- **Storage**: Local file system (configurable)

### Upload Example
```javascript
const formData = new FormData();
formData.append('file', audioFile);
formData.append('type', 'voice');
formData.append('content', 'Voice note content');

fetch('/api/notes', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});
```

## 🚀 Deployment

### Free Tier Hosting Options

#### Render
1. Connect GitHub repository
2. Set environment variables
3. Deploy automatically

#### Railway
1. Import from GitHub
2. Add environment variables
3. Deploy with one click

#### Fly.io
1. Install flyctl
2. Configure fly.toml
3. Deploy with `fly deploy`

### Environment Variables for Production
```bash
NODE_ENV=production
JWT_SECRET=your-super-secure-secret
MONGODB_URI=your-production-mongodb-uri
FRONTEND_URL=https://yourdomain.com
```

## 🧪 Testing

### Run Tests
```bash
npm test
```

### Test Coverage
```bash
npm run test:coverage
```

## 📊 Performance

### Database Indexes
- User email lookup
- Note search (text index)
- User notes with filters
- Timestamp-based sorting

### Caching Strategy
- JWT token validation
- User profile data
- Note metadata

### Rate Limiting
- 100 requests per 15 minutes per IP
- Configurable limits per endpoint

## 🔒 Security Features

- **JWT Authentication**: Secure token-based auth
- **Password Hashing**: bcrypt with 12 salt rounds
- **Input Validation**: Comprehensive request validation
- **CORS Protection**: Configurable cross-origin policies
- **Rate Limiting**: Prevent abuse and DDoS
- **Helmet**: Security headers
- **File Validation**: Type and size restrictions

## 🐛 Troubleshooting

### Common Issues

#### MongoDB Connection Failed
```bash
# Check if MongoDB is running
brew services list | grep mongodb
# or
sudo systemctl status mongodb
```

#### JWT Token Invalid
- Check token expiration
- Verify JWT_SECRET in .env
- Ensure token format: `Bearer <token>`

#### File Upload Failed
- Check file size (max 10MB)
- Verify file type
- Ensure uploads/ directory exists

#### CORS Errors
- Verify FRONTEND_URL in .env
- Check CORS configuration in server.js

### Debug Mode
```bash
NODE_ENV=development DEBUG=* npm run dev
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Make changes
4. Add tests
5. Submit pull request

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

- **Issues**: GitHub Issues
- **Documentation**: This README
- **API Testing**: Use Postman or similar tools

## 🔮 Future Enhancements

- [ ] Real-time notifications
- [ ] Note sharing between users
- [ ] Advanced search filters
- [ ] Note templates
- [ ] Export functionality
- [ ] Mobile app API optimization
- [ ] WebSocket support
- [ ] Analytics dashboard

---

**Built with ❤️ for OneClickNotes**
