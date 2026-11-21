require "minitest/autorun"
require_relative "release_config"

class ReleaseConfigTest < Minitest::Test
  def setup
    @key = OpenSSL::PKey::EC.generate("prime256v1").private_to_pem
    @env = { "ASC_KEY_ID" => "TESTKEY123", "ASC_ISSUER_ID" => "test-issuer",
             "APPLE_TEAM_ID" => "TESTTEAM12", "ASC_KEY_P8" => @key }
  end

  def test_raw_pem
    assert_equal({ key_id: "TESTKEY123", issuer_id: "test-issuer", team_id: "TESTTEAM12", key: @key },
                 SakuRelease.credentials(@env))
  end

  def test_base64_in_either_variable
    ["ASC_KEY_P8", "ASC_KEY_P8_BASE64"].each do |name|
      env = @env.reject { |key, _| key == "ASC_KEY_P8" }.merge(name => Base64.encode64(@key))
      assert_equal @key, SakuRelease.credentials(env).fetch(:key)
    end
  end

  def test_escaped_newlines
    assert_equal @key, SakuRelease.credentials(@env.merge("ASC_KEY_P8" => @key.gsub("\n", '\\n'))).fetch(:key)
  end

  def test_missing_required_values
    @env.each_key do |name|
      assert_raises(ArgumentError) { SakuRelease.credentials(@env.merge(name => "")) }
    end
  end

  def test_invalid_key_never_echoes_contents
    ["not a key!", Base64.strict_encode64("not a PEM key")].each do |key|
      error = assert_raises(ArgumentError) { SakuRelease.credentials(@env.merge("ASC_KEY_P8" => key)) }
      assert_equal "ASC key must contain a valid EC private key in PEM or base64 format", error.message
    end
  end

  def test_public_key_is_rejected
    public_key = OpenSSL::PKey::EC.generate("prime256v1").public_to_pem
    assert_raises(ArgumentError) { SakuRelease.credentials(@env.merge("ASC_KEY_P8" => public_key)) }
  end
end
