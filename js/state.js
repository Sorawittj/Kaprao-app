// =============================================
// Kaprao52 App - Global State
// =============================================

let cart = [];
let currentItem = null;
let activeCategory = 'kaprao';
let discountValue = 0;
let modalQty = 1;
let userStats = { points: 0, history: [], orderHistory: [] };
let lottoHistory = [];
let isSubmitting = false;
let pointsRedeemed = 0;
let isPointsActive = false;
let searchQuery = "";
let favoriteItems = new Set();
let isSyncing = false;
let currentOpenModal = null;
let isAdminMode = false;

// Wheel of Fortune state
let wheelSpinning = false;
let wheelAngle = 0;
let wheelSpinsToday = 0;
const MAX_WHEEL_SPINS = 3;

const avatarOptions = [
    'https://cdn.jsdelivr.net/gh/microsoft/fluentui-emoji@main/assets/Dog%20face/3D/dog_face_3d.png',
    'https://cdn.jsdelivr.net/gh/microsoft/fluentui-emoji@main/assets/Cat%20face/3D/cat_face_3d.png',
    'https://cdn.jsdelivr.net/gh/microsoft/fluentui-emoji@main/assets/Tiger%20face/3D/tiger_face_3d.png',
    'https://cdn.jsdelivr.net/gh/microsoft/fluentui-emoji@main/assets/Lion/3D/lion_3d.png',
    'https://cdn.jsdelivr.net/gh/microsoft/fluentui-emoji@main/assets/Monkey%20face/3D/monkey_face_3d.png',
    'https://cdn.jsdelivr.net/gh/microsoft/fluentui-emoji@main/assets/Elephant/3D/elephant_3d.png',
    'https://cdn.jsdelivr.net/gh/microsoft/fluentui-emoji@main/assets/Pig%20face/3D/pig_face_3d.png',
    'https://cdn.jsdelivr.net/gh/microsoft/fluentui-emoji@main/assets/Chicken/3D/chicken_3d.png',
    'https://cdn.jsdelivr.net/gh/microsoft/fluentui-emoji@main/assets/Panda/3D/panda_3d.png',
    'https://cdn.jsdelivr.net/gh/microsoft/fluentui-emoji@main/assets/Frog/3D/frog_3d.png'
];
let userAvatar = { image: avatarOptions[0], hat: false, name: 'น้องฝึกหัด', userId: null };
