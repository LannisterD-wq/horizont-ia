import os
from datetime import datetime
from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime, Float, ForeignKey, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship, scoped_session
import json

# Pega a URL do banco do Railway automaticamente
DATABASE_URL = 'sqlite:///horizont.db'
# Corrige URL para PostgreSQL se necessário
if DATABASE_URL.startswith('postgres://'):
    DATABASE_URL = DATABASE_URL.replace('postgres://', 'postgresql://', 1)

# Configuração do SQLAlchemy
engine = create_engine(DATABASE_URL)
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
Base.metadata.create_all(bind=engine)

# Funções auxiliares
def get_db():
    db = SessionLocal()
    try:
        return db
    finally:
        pass  # Não fecha aqui, deixa para o cleanup

def close_db():
    SessionLocal.remove()

# Inicializa usuários padrão
def init_default_users():
    db = SessionLocal()
    try:
        # Verifica se já existem usuários
        if db.query(User).first():
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
        
    except Exception as e:
        print(f"Erro ao criar usuários padrão: {e}")
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
        print(f"Erro na migração: {e}")
        db.rollback()
    finally:
        db.close()

# Inicializa o banco com usuários padrão
init_default_users()