import os
from datetime import datetime
from sqlalchemy import create_engine, Column, Integer, Float, DateTime
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base


#//Once postgres is installed,
# Init db cluster
#Create aesd_project user
#Set password 
#Create db climate_mointoring
DB_USERNAME = "aesd_project"
DB_PASSWORD = "Paxxw0rd!"
DB_HOST = "localhost"
DB_NAME = "climate_monitoring"
db_url = os.getenv('DATABASE_URL')


# Create a SQLAlchemy engine
engine = create_engine(db_url)

# Define a base class for declarative models
Base = declarative_base()





class Measurement(Base):
    __tablename__ = "measurements"

    id = Column(Integer, primary_key=True)
    altitude = Column(Float)
    temperature = Column(Float)
    timestamp = Column(DateTime, default=datetime.utcnow)
    
    
# Create the table if it does not exist
Base.metadata.drop_all(engine)
Base.metadata.create_all(engine)




def store_measurement(temp,alt):
    Session = sessionmaker(bind=engine)
    session = Session()
    
    measurment = Measurement(temperature=temp,altitude=alt)
    session.add(measurment)
    session.commit()
    session.close()
    return True
    
def get_latest_measurments():
    Session = sessionmaker(bind=engine)
    session = Session()
    latest_readings = session.query(Measurement).order_by(Measurement.timestamp.desc()).limit(10).all()
    session.close()
    return latest_readings
    
