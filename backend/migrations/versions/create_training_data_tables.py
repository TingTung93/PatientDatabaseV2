"""create training data tables

Revision ID: create_training_data_tables
Revises: 
Create Date: 2024-03-27 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'create_training_data_tables'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    # Create training_data table
    op.create_table(
        'training_data',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('caution_card_id', sa.Integer(), nullable=False),
        sa.Column('field_name', sa.String(), nullable=False),
        sa.Column('original_ocr_text', sa.Text(), nullable=True),
        sa.Column('corrected_text', sa.Text(), nullable=True),
        sa.Column('confidence_score', sa.Float(), nullable=True),
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.TIMESTAMP(), server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.ForeignKeyConstraint(['caution_card_id'], ['caution_cards.id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )

    # Create error_patterns table
    op.create_table(
        'error_patterns',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('pattern_type', sa.String(), nullable=False),
        sa.Column('original_text', sa.Text(), nullable=True),
        sa.Column('corrected_text', sa.Text(), nullable=True),
        sa.Column('frequency', sa.Integer(), server_default='1'),
        sa.Column('created_at', sa.TIMESTAMP(), server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.TIMESTAMP(), server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.PrimaryKeyConstraint('id')
    )

    # Create training_mode_settings table
    op.create_table(
        'training_mode_settings',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('is_training_mode', sa.Boolean(), server_default='0'),
        sa.Column('last_updated', sa.TIMESTAMP(), server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )


def downgrade():
    op.drop_table('training_mode_settings')
    op.drop_table('error_patterns')
    op.drop_table('training_data') 