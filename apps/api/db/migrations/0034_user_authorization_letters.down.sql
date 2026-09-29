DROP TRIGGER IF EXISTS users_approval_requires_valid_letter ON users;
DROP FUNCTION IF EXISTS users_approval_requires_valid_letter();
DROP TABLE IF EXISTS user_authorization_documents;
DROP FUNCTION IF EXISTS user_authorization_document_no_delete();
DROP FUNCTION IF EXISTS user_authorization_document_guard();
