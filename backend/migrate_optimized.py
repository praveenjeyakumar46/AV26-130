"""
Quick Migration Script
Automatically backs up and replaces old files with optimized versions
"""

import shutil
from pathlib import Path
import sys

def migrate_to_optimized():
    """Migrate to optimized knowledge base and matcher"""
    
    backend_dir = Path(__file__).parent
    
    print("🔄 Starting migration to optimized knowledge base...")
    print("=" * 70)
    
    # Files to migrate
    migrations = [
        {
            'old': 'csv_knowledge_base.py',
            'new': 'csv_knowledge_base_optimized.py',
            'backup': 'csv_knowledge_base_old_backup.py'
        },
        {
            'old': 'legal_section_matcher.py',
            'new': 'legal_section_matcher_optimized.py',
            'backup': 'legal_section_matcher_old_backup.py'
        }
    ]
    
    success_count = 0
    
    for migration in migrations:
        old_file = backend_dir / migration['old']
        new_file = backend_dir / migration['new']
        backup_file = backend_dir / migration['backup']
        
        print(f"\n📁 Processing: {migration['old']}")
        
        # Check if new file exists
        if not new_file.exists():
            print(f"   ❌ New file not found: {migration['new']}")
            continue
        
        # Backup old file if it exists
        if old_file.exists():
            print(f"   💾 Backing up to: {migration['backup']}")
            try:
                shutil.copy2(old_file, backup_file)
                print(f"   ✅ Backup created successfully")
            except Exception as e:
                print(f"   ❌ Backup failed: {e}")
                continue
        
        # Replace old file with new optimized version
        print(f"   🔄 Replacing with optimized version...")
        try:
            shutil.copy2(new_file, old_file)
            print(f"   ✅ Successfully replaced with optimized version")
            success_count += 1
        except Exception as e:
            print(f"   ❌ Replacement failed: {e}")
            # Try to restore backup
            if backup_file.exists():
                print(f"   🔄 Restoring from backup...")
                try:
                    shutil.copy2(backup_file, old_file)
                    print(f"   ✅ Backup restored")
                except Exception as e2:
                    print(f"   ❌ Backup restoration failed: {e2}")
    
    print("\n" + "=" * 70)
    
    if success_count == len(migrations):
        print("✅ Migration completed successfully!")
        print(f"   {success_count}/{len(migrations)} files migrated")
        print("\n📝 Next steps:")
        print("   1. Restart your server to load the new optimized modules")
        print("   2. Run 'python test_performance.py' to verify improvements")
        print("   3. Monitor the application for any issues")
        print("\n💡 To rollback, rename the backup files:")
        for m in migrations:
            print(f"   - {m['backup']} → {m['old']}")
    elif success_count > 0:
        print(f"⚠️  Partial migration: {success_count}/{len(migrations)} files migrated")
        print("   Check error messages above and fix issues")
    else:
        print("❌ Migration failed - no files were migrated")
        print("   Check error messages above")
    
    print("=" * 70)
    
    return success_count == len(migrations)


def rollback_migration():
    """Rollback to old versions"""
    
    backend_dir = Path(__file__).parent
    
    print("🔄 Rolling back to previous versions...")
    print("=" * 70)
    
    backups = [
        ('csv_knowledge_base_old_backup.py', 'csv_knowledge_base.py'),
        ('legal_section_matcher_old_backup.py', 'legal_section_matcher.py')
    ]
    
    success_count = 0
    
    for backup_name, target_name in backups:
        backup_file = backend_dir / backup_name
        target_file = backend_dir / target_name
        
        print(f"\n📁 Restoring: {backup_name} → {target_name}")
        
        if not backup_file.exists():
            print(f"   ⚠️  Backup not found: {backup_name}")
            continue
        
        try:
            shutil.copy2(backup_file, target_file)
            print(f"   ✅ Successfully restored")
            success_count += 1
        except Exception as e:
            print(f"   ❌ Restoration failed: {e}")
    
    print("\n" + "=" * 70)
    
    if success_count > 0:
        print(f"✅ Rollback completed: {success_count}/{len(backups)} files restored")
        print("   Restart your server to load the previous versions")
    else:
        print("❌ Rollback failed - no files were restored")
    
    print("=" * 70)


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == '--rollback':
        rollback_migration()
    else:
        print("\n" + "=" * 70)
        print("🚀 AUTOMATIC MIGRATION TO OPTIMIZED KNOWLEDGE BASE")
        print("=" * 70)
        print("\nThis script will:")
        print("  1. Backup your current files (just in case)")
        print("  2. Replace them with optimized versions")
        print("  3. Keep backups so you can rollback if needed")
        print("\nBackups will be saved as:")
        print("  - csv_knowledge_base_old_backup.py")
        print("  - legal_section_matcher_old_backup.py")
        print("\nTo rollback later, run: python migrate_optimized.py --rollback")
        print("=" * 70)
        
        response = input("\n❓ Proceed with migration? (yes/no): ").strip().lower()
        
        if response in ['yes', 'y']:
            success = migrate_to_optimized()
            sys.exit(0 if success else 1)
        else:
            print("\n❌ Migration cancelled by user")
            sys.exit(0)
