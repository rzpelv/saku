require "base64"
require "openssl"

module SakuRelease
  def self.credentials(env = ENV)
    credentials = %w[ASC_KEY_ID ASC_ISSUER_ID APPLE_TEAM_ID].to_h do |name|
      value = env[name].to_s.strip
      raise ArgumentError, "#{name} must be set" if value.empty?
      [name, value]
    end

    key = env["ASC_KEY_P8"].to_s.strip
    key = env["ASC_KEY_P8_BASE64"].to_s.strip if key.empty?
    raise ArgumentError, "Set ASC_KEY_P8 or ASC_KEY_P8_BASE64" if key.empty?

    begin
      key = key.gsub('\\n', "\n")
      key = Base64.strict_decode64(key.gsub(/\s+/, "")) unless key.start_with?("-----BEGIN")
      key = "#{key.strip}\n"
      parsed = OpenSSL::PKey.read(key)
      raise ArgumentError unless parsed.is_a?(OpenSSL::PKey::EC) && parsed.private?
    rescue ArgumentError, OpenSSL::PKey::PKeyError
      raise ArgumentError, "ASC key must contain a valid EC private key in PEM or base64 format"
    end

    { key_id: credentials.fetch("ASC_KEY_ID"), issuer_id: credentials.fetch("ASC_ISSUER_ID"),
      team_id: credentials.fetch("APPLE_TEAM_ID"), key: key }
  end
end
