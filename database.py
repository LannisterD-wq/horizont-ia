import os
import sys
from datetime import datetime
from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime, Float, ForeignKey, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship, scoped_session
import json

# CORREÇÃO: Garante que o banco seja criado na pasta do projeto
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_FILE = os.path.join(BASE_DIR, 'horizont.db')

print(f"📁 Pasta do projeto: {BASE_DIR}")

# Pega a URL do banco do Railway ou usa SQLite local
DATABASE_URL = os.environ.get('DATABASE_URL', '')

# Se não houver DATABASE_URL, usa SQLite com caminho absoluto
if not DATABASE_URL:
    DATABASE_URL = f'sqlite:///{DB_FILE}'  # Usa caminho absoluto
    print(f"📊 Usando SQLite local: {DB_FILE}")
    
    # Verifica se o arquivo já existe
    if os.path.exists(DB_FILE):
        size = os.path.getsize(DB_FILE) / 1024  # KB
        print(f"✅ Banco existente encontrado ({size:.1f} KB)")
    else:
        print("📦 Novo banco de dados será criado")

# Corrige URL para PostgreSQL se necessário
if DATABASE_URL.startswith('postgres://'):
    DATABASE_URL = DATABASE_URL.replace('postgres://', 'postgresql://', 1)

print(f"🔗 String de conexão: {DATABASE_URL[:50]}...")

# Configuração do SQLAlchemy com echo para debug
engine = create_engine(
    DATABASE_URL,
    echo=False,  # Mude para True se quiser ver os SQLs
    connect_args={'check_same_thread': False} if 'sqlite' in DATABASE_URL else {}
)

SessionLocal = scoped_session(sessionmaker(autocommit=False, autoflush=False, bind=engine))
Base = declarative_base()

# Modelos do Banco de Dados
class User(Base):
    __tablename__ = 'users'
    
    id = Column(Integer, primary_key=True)
    username = Column(String(50), unique=True, nullable=False)
    password = Column(String(100), nullable=False)
    name = Column(String(100))
    cpf = Column(String(20))
    role = Column(String(20), default='user')
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relacionamentos
    chats = relationship('Chat', back_populates='user', cascade='all, delete-orphan')
    leads = relationship('Lead', back_populates='user', cascade='all, delete-orphan')

class Chat(Base):
    __tablename__ = 'chats'
    
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    title = Column(String(200))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relacionamentos
    user = relationship('User', back_populates='chats')
    messages = relationship('Message', back_populates='chat', cascade='all, delete-orphan', order_by='Message.created_at')

class Message(Base):
    __tablename__ = 'messages'
    
    id = Column(Integer, primary_key=True)
    chat_id = Column(Integer, ForeignKey('chats.id'), nullable=False)
    role = Column(String(20), nullable=False)  # 'user' ou 'assistant'
    content = Column(Text, nullable=False)
    files = Column(JSON)  # Armazena info dos arquivos como JSON
    chart = Column(JSON)  # Armazena dados do gráfico como JSON
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relacionamentos
    chat = relationship('Chat', back_populates='messages')

class Lead(Base):
    __tablename__ = 'leads'
    
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    name = Column(String(100), nullable=False)
    phone = Column(String(20))
    email = Column(String(100))
    status = Column(String(20))  # quente, morno, frio
    value = Column(Float, default=0)
    product = Column(String(50))  # smart, trend, leverage
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relacionamentos
    user = relationship('User', back_populates='leads')

# Cria as tabelas
try:
    Base.metadata.create_all(bind=engine)
    print("✅ Tabelas do banco de dados criadas/verificadas")
    
    # Verifica se o arquivo foi criado (para SQLite)
    if 'sqlite' in DATABASE_URL and os.path.exists(DB_FILE):
        print(f"✅ Arquivo do banco criado: {DB_FILE}")
        
except Exception as e:
    print(f"❌ Erro ao criar tabelas: {e}")
    import traceback
    traceback.print_exc()

# Funções auxiliares
def get_db():
    """Retorna uma sessão do banco de dados"""
    return SessionLocal()

def close_db():
    """Remove a sessão do banco de dados"""
    SessionLocal.remove()

# Inicializa usuários padrão
def init_default_users():
    db = SessionLocal()
    try:
        # Verifica se já existem usuários
        existing_users = db.query(User).count()
        if existing_users > 0:
            print(f"✅ {existing_users} usuários já existem no banco de dados")
            
            # Lista os usuários existentes
            users = db.query(User).all()
            print("👥 Usuários cadastrados:")
            for user in users:
                print(f"   - {user.username} ({user.name}) - Role: {user.role}")
            return
        
        # Cria usuários padrão
        default_users = [
            User(username='admin', password='horizont2025', name='Administrador', cpf='000.000.000-00', role='admin'),
            User(username='carlos', password='123456', name='Carlos Silva', cpf='123.456.789-00', role='user'),
            User(username='ana', password='123456', name='Ana Santos', cpf='987.654.321-00', role='user'),
            User(username='paulo', password='123456', name='Paulo Costa', cpf='456.789.123-00', role='user')
        ]
        
        for user in default_users:
            db.add(user)
        
        db.commit()
        print("✅ Usuários padrão criados no banco de dados!")
        
        # Confirma criação
        for user in default_users:
            print(f"   ✓ {user.username} - senha: {user.password}")
        
    except Exception as e:
        print(f"❌ Erro ao criar usuários padrão: {e}")
        db.rollback()
    finally:
        db.close()

# Função para migrar dados existentes
def migrate_existing_data(chats_storage):
    """Migra dados da memória para o banco de dados"""
    db = SessionLocal()
    try:
        for username, chats in chats_storage.items():
            # Busca o usuário
            user = db.query(User).filter_by(username=username).first()
            if not user:
                continue
            
            for chat_data in chats:
                # Verifica se o chat já existe
                existing_chat = db.query(Chat).filter_by(
                    user_id=user.id,
                    title=chat_data.get('title', 'Conversa sem título')
                ).first()
                
                if existing_chat:
                    continue
                
                # Cria o chat
                chat = Chat(
                    user_id=user.id,
                    title=chat_data.get('title', 'Conversa sem título'),
                    created_at=datetime.fromisoformat(chat_data.get('createdAt', datetime.utcnow().isoformat()))
                )
                db.add(chat)
                db.flush()  # Para obter o ID do chat
                
                # Adiciona as mensagens
                for msg_data in chat_data.get('messages', []):
                    message = Message(
                        chat_id=chat.id,
                        role=msg_data['role'],
                        content=msg_data['content'],
                        files=msg_data.get('files'),
                        chart=msg_data.get('chart'),
                        created_at=datetime.fromisoformat(msg_data.get('timestamp', datetime.utcnow().isoformat()))
                    )
                    db.add(message)
        
        db.commit()
        print("✅ Dados migrados para o banco de dados!")
        
    except Exception as e:
        print(f"❌ Erro na migração: {e}")
        db.rollback()
    finally:
        db.close()

# Inicializa o banco com usuários padrão
if __name__ == "__main__":
    print("\n" + "="*60)
    print("INICIALIZANDO BANCO DE DADOS")
    print("="*60)
    
try:
    init_default_users()
    
    # Verifica se o arquivo foi criado
    if 'sqlite' in DATABASE_URL:
        if os.path.exists(DB_FILE):
            size = os.path.getsize(DB_FILE) / 1024
            print(f"\n📊 Status final: Banco criado com sucesso!")
            print(f"   📁 Arquivo: {DB_FILE}")
            print(f"   📏 Tamanho: {size:.1f} KB")
        else:
            print("\n⚠️ AVISO: Arquivo do banco não foi criado!")
            print("   Verifique permissões de escrita na pasta")
            
except Exception as e:
    print(f"⚠️ Erro ao inicializar: {e}")
