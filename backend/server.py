from fastapi import FastAPI, APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
SECRET_KEY = os.environ.get('JWT_SECRET', 'your-secret-key-change-in-production')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 480

security = HTTPBearer()

app = FastAPI()
api_router = APIRouter(prefix="/api")

# ==================== Models ====================

# User Models
class UserBase(BaseModel):
    username: str
    full_name: str
    role: str = "user"  # admin or user

class UserCreate(UserBase):
    password: str

class User(UserBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class LoginRequest(BaseModel):
    username: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: User

# Ammunition Models
class AmmunitionBase(BaseModel):
    name: str
    type: str  # نوع الذخيرة
    caliber: str  # العيار
    quantity: int
    min_stock: int = 100  # الحد الأدنى للمخزون
    unit: str = "قطعة"  # الوحدة
    notes: Optional[str] = None

class AmmunitionCreate(AmmunitionBase):
    pass

class Ammunition(AmmunitionBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Weapon Models
class WeaponBase(BaseModel):
    name: str
    type: str  # نوع السلاح
    serial_number: str  # الرقم التسلسلي
    status: str = "متاح"  # متاح، مسلم، صيانة
    assigned_to: Optional[str] = None  # معرف الفرد
    notes: Optional[str] = None

class WeaponCreate(WeaponBase):
    pass

class Weapon(WeaponBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Personnel Models
class PersonnelBase(BaseModel):
    military_id: str  # الرقم العسكري
    name: str
    rank: str  # الرتبة
    unit: str  # الوحدة
    phone: Optional[str] = None
    notes: Optional[str] = None

class PersonnelCreate(PersonnelBase):
    pass

class Personnel(PersonnelBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Transaction Models (الوارد والمنصرف)
class TransactionBase(BaseModel):
    type: str  # ammunition or weapon
    item_id: str  # معرف الذخيرة أو السلاح
    item_name: str  # اسم الصنف
    transaction_type: str  # وارد أو منصرف
    quantity: Optional[int] = None  # للذخائر فقط
    personnel_id: Optional[str] = None  # للمنصرف فقط
    personnel_name: Optional[str] = None
    notes: Optional[str] = None

class TransactionCreate(TransactionBase):
    pass

class Transaction(TransactionBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    created_by: Optional[str] = None

# ==================== Auth Functions ====================

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        user = await db.users.find_one({"id": user_id}, {"_id": 0})
        if user is None:
            raise HTTPException(status_code=401, detail="User not found")
        
        if isinstance(user.get('created_at'), str):
            user['created_at'] = datetime.fromisoformat(user['created_at'])
        
        return User(**user)
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

# ==================== Auth Routes ====================

@api_router.post("/auth/register", response_model=User)
async def register(user_data: UserCreate):
    # Check if username exists
    existing = await db.users.find_one({"username": user_data.username})
    if existing:
        raise HTTPException(status_code=400, detail="اسم المستخدم موجود بالفعل")
    
    # Hash password
    hashed_pwd = hash_password(user_data.password)
    
    user_dict = user_data.model_dump(exclude={'password'})
    user_obj = User(**user_dict)
    
    doc = user_obj.model_dump()
    doc['password'] = hashed_pwd
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.users.insert_one(doc)
    return user_obj

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(login_data: LoginRequest):
    user = await db.users.find_one({"username": login_data.username}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="اسم المستخدم أو كلمة المرور غير صحيحة")
    
    if not verify_password(login_data.password, user['password']):
        raise HTTPException(status_code=401, detail="اسم المستخدم أو كلمة المرور غير صحيحة")
    
    if isinstance(user.get('created_at'), str):
        user['created_at'] = datetime.fromisoformat(user['created_at'])
    
    user_obj = User(**{k: v for k, v in user.items() if k != 'password'})
    
    access_token = create_access_token(data={"sub": user_obj.id})
    
    return TokenResponse(access_token=access_token, user=user_obj)

@api_router.get("/auth/me", response_model=User)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user

# ==================== Ammunition Routes ====================

@api_router.post("/ammunition", response_model=Ammunition)
async def create_ammunition(ammo_data: AmmunitionCreate, current_user: User = Depends(get_current_user)):
    ammo_obj = Ammunition(**ammo_data.model_dump())
    
    doc = ammo_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    
    await db.ammunition.insert_one(doc)
    return ammo_obj

@api_router.get("/ammunition", response_model=List[Ammunition])
async def get_ammunition(current_user: User = Depends(get_current_user)):
    ammo_list = await db.ammunition.find({}, {"_id": 0}).to_list(1000)
    
    for ammo in ammo_list:
        if isinstance(ammo.get('created_at'), str):
            ammo['created_at'] = datetime.fromisoformat(ammo['created_at'])
        if isinstance(ammo.get('updated_at'), str):
            ammo['updated_at'] = datetime.fromisoformat(ammo['updated_at'])
    
    return ammo_list

@api_router.get("/ammunition/{ammo_id}", response_model=Ammunition)
async def get_ammunition_by_id(ammo_id: str, current_user: User = Depends(get_current_user)):
    ammo = await db.ammunition.find_one({"id": ammo_id}, {"_id": 0})
    if not ammo:
        raise HTTPException(status_code=404, detail="الذخيرة غير موجودة")
    
    if isinstance(ammo.get('created_at'), str):
        ammo['created_at'] = datetime.fromisoformat(ammo['created_at'])
    if isinstance(ammo.get('updated_at'), str):
        ammo['updated_at'] = datetime.fromisoformat(ammo['updated_at'])
    
    return Ammunition(**ammo)

@api_router.put("/ammunition/{ammo_id}", response_model=Ammunition)
async def update_ammunition(ammo_id: str, ammo_data: AmmunitionCreate, current_user: User = Depends(get_current_user)):
    existing = await db.ammunition.find_one({"id": ammo_id})
    if not existing:
        raise HTTPException(status_code=404, detail="الذخيرة غير موجودة")
    
    update_dict = ammo_data.model_dump()
    update_dict['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    await db.ammunition.update_one({"id": ammo_id}, {"$set": update_dict})
    
    updated = await db.ammunition.find_one({"id": ammo_id}, {"_id": 0})
    if isinstance(updated.get('created_at'), str):
        updated['created_at'] = datetime.fromisoformat(updated['created_at'])
    if isinstance(updated.get('updated_at'), str):
        updated['updated_at'] = datetime.fromisoformat(updated['updated_at'])
    
    return Ammunition(**updated)

@api_router.delete("/ammunition/{ammo_id}")
async def delete_ammunition(ammo_id: str, current_user: User = Depends(get_current_user)):
    result = await db.ammunition.delete_one({"id": ammo_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="الذخيرة غير موجودة")
    return {"message": "تم حذف الذخيرة بنجاح"}

# ==================== Weapon Routes ====================

@api_router.post("/weapons", response_model=Weapon)
async def create_weapon(weapon_data: WeaponCreate, current_user: User = Depends(get_current_user)):
    # Check if serial number exists
    existing = await db.weapons.find_one({"serial_number": weapon_data.serial_number})
    if existing:
        raise HTTPException(status_code=400, detail="الرقم التسلسلي موجود بالفعل")
    
    weapon_obj = Weapon(**weapon_data.model_dump())
    
    doc = weapon_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    
    await db.weapons.insert_one(doc)
    return weapon_obj

@api_router.get("/weapons", response_model=List[Weapon])
async def get_weapons(current_user: User = Depends(get_current_user)):
    weapons = await db.weapons.find({}, {"_id": 0}).to_list(1000)
    
    for weapon in weapons:
        if isinstance(weapon.get('created_at'), str):
            weapon['created_at'] = datetime.fromisoformat(weapon['created_at'])
        if isinstance(weapon.get('updated_at'), str):
            weapon['updated_at'] = datetime.fromisoformat(weapon['updated_at'])
    
    return weapons

@api_router.get("/weapons/{weapon_id}", response_model=Weapon)
async def get_weapon_by_id(weapon_id: str, current_user: User = Depends(get_current_user)):
    weapon = await db.weapons.find_one({"id": weapon_id}, {"_id": 0})
    if not weapon:
        raise HTTPException(status_code=404, detail="السلاح غير موجود")
    
    if isinstance(weapon.get('created_at'), str):
        weapon['created_at'] = datetime.fromisoformat(weapon['created_at'])
    if isinstance(weapon.get('updated_at'), str):
        weapon['updated_at'] = datetime.fromisoformat(weapon['updated_at'])
    
    return Weapon(**weapon)

@api_router.put("/weapons/{weapon_id}", response_model=Weapon)
async def update_weapon(weapon_id: str, weapon_data: WeaponCreate, current_user: User = Depends(get_current_user)):
    existing = await db.weapons.find_one({"id": weapon_id})
    if not existing:
        raise HTTPException(status_code=404, detail="السلاح غير موجود")
    
    # Check serial number if changed
    if weapon_data.serial_number != existing.get('serial_number'):
        serial_exists = await db.weapons.find_one({"serial_number": weapon_data.serial_number})
        if serial_exists:
            raise HTTPException(status_code=400, detail="الرقم التسلسلي موجود بالفعل")
    
    update_dict = weapon_data.model_dump()
    update_dict['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    await db.weapons.update_one({"id": weapon_id}, {"$set": update_dict})
    
    updated = await db.weapons.find_one({"id": weapon_id}, {"_id": 0})
    if isinstance(updated.get('created_at'), str):
        updated['created_at'] = datetime.fromisoformat(updated['created_at'])
    if isinstance(updated.get('updated_at'), str):
        updated['updated_at'] = datetime.fromisoformat(updated['updated_at'])
    
    return Weapon(**updated)

@api_router.delete("/weapons/{weapon_id}")
async def delete_weapon(weapon_id: str, current_user: User = Depends(get_current_user)):
    result = await db.weapons.delete_one({"id": weapon_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="السلاح غير موجود")
    return {"message": "تم حذف السلاح بنجاح"}

# ==================== Personnel Routes ====================

@api_router.post("/personnel", response_model=Personnel)
async def create_personnel(personnel_data: PersonnelCreate, current_user: User = Depends(get_current_user)):
    # Check if military_id exists
    existing = await db.personnel.find_one({"military_id": personnel_data.military_id})
    if existing:
        raise HTTPException(status_code=400, detail="الرقم العسكري موجود بالفعل")
    
    personnel_obj = Personnel(**personnel_data.model_dump())
    
    doc = personnel_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    
    await db.personnel.insert_one(doc)
    return personnel_obj

@api_router.get("/personnel", response_model=List[Personnel])
async def get_personnel(current_user: User = Depends(get_current_user)):
    personnel_list = await db.personnel.find({}, {"_id": 0}).to_list(1000)
    
    for personnel in personnel_list:
        if isinstance(personnel.get('created_at'), str):
            personnel['created_at'] = datetime.fromisoformat(personnel['created_at'])
        if isinstance(personnel.get('updated_at'), str):
            personnel['updated_at'] = datetime.fromisoformat(personnel['updated_at'])
    
    return personnel_list

@api_router.get("/personnel/{personnel_id}", response_model=Personnel)
async def get_personnel_by_id(personnel_id: str, current_user: User = Depends(get_current_user)):
    personnel = await db.personnel.find_one({"id": personnel_id}, {"_id": 0})
    if not personnel:
        raise HTTPException(status_code=404, detail="الفرد غير موجود")
    
    if isinstance(personnel.get('created_at'), str):
        personnel['created_at'] = datetime.fromisoformat(personnel['created_at'])
    if isinstance(personnel.get('updated_at'), str):
        personnel['updated_at'] = datetime.fromisoformat(personnel['updated_at'])
    
    return Personnel(**personnel)

@api_router.put("/personnel/{personnel_id}", response_model=Personnel)
async def update_personnel(personnel_id: str, personnel_data: PersonnelCreate, current_user: User = Depends(get_current_user)):
    existing = await db.personnel.find_one({"id": personnel_id})
    if not existing:
        raise HTTPException(status_code=404, detail="الفرد غير موجود")
    
    # Check military_id if changed
    if personnel_data.military_id != existing.get('military_id'):
        id_exists = await db.personnel.find_one({"military_id": personnel_data.military_id})
        if id_exists:
            raise HTTPException(status_code=400, detail="الرقم العسكري موجود بالفعل")
    
    update_dict = personnel_data.model_dump()
    update_dict['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    await db.personnel.update_one({"id": personnel_id}, {"$set": update_dict})
    
    updated = await db.personnel.find_one({"id": personnel_id}, {"_id": 0})
    if isinstance(updated.get('created_at'), str):
        updated['created_at'] = datetime.fromisoformat(updated['created_at'])
    if isinstance(updated.get('updated_at'), str):
        updated['updated_at'] = datetime.fromisoformat(updated['updated_at'])
    
    return Personnel(**updated)

@api_router.delete("/personnel/{personnel_id}")
async def delete_personnel(personnel_id: str, current_user: User = Depends(get_current_user)):
    result = await db.personnel.delete_one({"id": personnel_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="الفرد غير موجود")
    return {"message": "تم حذف الفرد بنجاح"}

# ==================== Transaction Routes ====================

@api_router.post("/transactions", response_model=Transaction)
async def create_transaction(transaction_data: TransactionCreate, current_user: User = Depends(get_current_user)):
    transaction_obj = Transaction(**transaction_data.model_dump())
    transaction_obj.created_by = current_user.username
    
    # Update inventory
    if transaction_data.type == "ammunition":
        ammo = await db.ammunition.find_one({"id": transaction_data.item_id})
        if not ammo:
            raise HTTPException(status_code=404, detail="الذخيرة غير موجودة")
        
        new_quantity = ammo['quantity']
        if transaction_data.transaction_type == "وارد":
            new_quantity += transaction_data.quantity
        else:  # منصرف
            if ammo['quantity'] < transaction_data.quantity:
                raise HTTPException(status_code=400, detail="الكمية المتاحة غير كافية")
            new_quantity -= transaction_data.quantity
        
        await db.ammunition.update_one(
            {"id": transaction_data.item_id},
            {"$set": {"quantity": new_quantity, "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
    
    elif transaction_data.type == "weapon":
        weapon = await db.weapons.find_one({"id": transaction_data.item_id})
        if not weapon:
            raise HTTPException(status_code=404, detail="السلاح غير موجود")
        
        if transaction_data.transaction_type == "منصرف":
            if weapon['status'] == "مسلم":
                raise HTTPException(status_code=400, detail="السلاح مسلم بالفعل")
            
            await db.weapons.update_one(
                {"id": transaction_data.item_id},
                {"$set": {
                    "status": "مسلم",
                    "assigned_to": transaction_data.personnel_id,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }}
            )
        else:  # وارد (إرجاع)
            await db.weapons.update_one(
                {"id": transaction_data.item_id},
                {"$set": {
                    "status": "متاح",
                    "assigned_to": None,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }}
            )
    
    doc = transaction_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.transactions.insert_one(doc)
    return transaction_obj

@api_router.get("/transactions", response_model=List[Transaction])
async def get_transactions(current_user: User = Depends(get_current_user)):
    transactions = await db.transactions.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    
    for transaction in transactions:
        if isinstance(transaction.get('created_at'), str):
            transaction['created_at'] = datetime.fromisoformat(transaction['created_at'])
    
    return transactions

# ==================== Reports Routes ====================

@api_router.get("/reports/inventory")
async def get_inventory_report(current_user: User = Depends(get_current_user)):
    ammunition = await db.ammunition.find({}, {"_id": 0}).to_list(1000)
    weapons = await db.weapons.find({}, {"_id": 0}).to_list(1000)
    
    ammo_low_stock = [a for a in ammunition if a['quantity'] <= a.get('min_stock', 0)]
    
    weapon_stats = {
        "total": len(weapons),
        "available": len([w for w in weapons if w['status'] == 'متاح']),
        "assigned": len([w for w in weapons if w['status'] == 'مسلم']),
        "maintenance": len([w for w in weapons if w['status'] == 'صيانة'])
    }
    
    return {
        "ammunition_count": len(ammunition),
        "weapons_count": len(weapons),
        "low_stock_ammo": ammo_low_stock,
        "weapon_stats": weapon_stats
    }

@api_router.get("/reports/personnel-weapons")
async def get_personnel_weapons_report(current_user: User = Depends(get_current_user)):
    personnel = await db.personnel.find({}, {"_id": 0}).to_list(1000)
    weapons = await db.weapons.find({}, {"_id": 0}).to_list(1000)
    
    report = []
    for person in personnel:
        assigned_weapons = [w for w in weapons if w.get('assigned_to') == person['id']]
        report.append({
            "personnel": person,
            "weapons": assigned_weapons
        })
    
    return report

@api_router.get("/reports/transactions")
async def get_transactions_report(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    transaction_type: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    query = {}
    
    if start_date and end_date:
        query['created_at'] = {
            "$gte": start_date,
            "$lte": end_date
        }
    
    if transaction_type:
        query['transaction_type'] = transaction_type
    
    transactions = await db.transactions.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    
    for transaction in transactions:
        if isinstance(transaction.get('created_at'), str):
            transaction['created_at'] = datetime.fromisoformat(transaction['created_at'])
    
    return transactions

@api_router.get("/reports/statistics")
async def get_statistics(current_user: User = Depends(get_current_user)):
    total_ammo = await db.ammunition.count_documents({})
    total_weapons = await db.weapons.count_documents({})
    total_personnel = await db.personnel.count_documents({})
    total_transactions = await db.transactions.count_documents({})
    
    assigned_weapons = await db.weapons.count_documents({"status": "مسلم"})
    available_weapons = await db.weapons.count_documents({"status": "متاح"})
    
    return {
        "total_ammunition_types": total_ammo,
        "total_weapons": total_weapons,
        "total_personnel": total_personnel,
        "total_transactions": total_transactions,
        "assigned_weapons": assigned_weapons,
        "available_weapons": available_weapons
    }

# ==================== Settings Routes ====================

@api_router.get("/users", response_model=List[User])
async def get_users(current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="غير مصرح")
    
    users = await db.users.find({}, {"_id": 0, "password": 0}).to_list(1000)
    
    for user in users:
        if isinstance(user.get('created_at'), str):
            user['created_at'] = datetime.fromisoformat(user['created_at'])
    
    return users

@api_router.delete("/users/{user_id}")
async def delete_user(user_id: str, current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="غير مصرح")
    
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="لا يمكن حذف حسابك الخاص")
    
    result = await db.users.delete_one({"id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="المستخدم غير موجود")
    
    return {"message": "تم حذف المستخدم بنجاح"}

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()